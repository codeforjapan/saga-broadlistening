import "server-only";

import { getAiModel } from "@mirai-gikai/shared/ai/registry";
import { readAssistantTurnMeta } from "@mirai-gikai/shared/interview-prompts/assistant-message";
import {
  interviewChatTextSchema,
  interviewInitialSchema,
} from "@mirai-gikai/shared/interview-prompts/output-schemas";
import {
  buildPublishedInitialPrompt,
  buildPublishedInterviewPrompt,
  buildPublishedSummaryPrompt,
} from "@mirai-gikai/shared/interview-prompts/published";
import {
  type AssistantTurnMeta,
  buildTurnTopics,
  computeSummaryState,
  computeTurnState,
  decideSummaryEntry,
  RESUME_TOPIC_ID,
} from "@mirai-gikai/shared/interview-prompts/turn-control";
import {
  buildChatTurnRecord,
  buildInitialTurnContent,
} from "@mirai-gikai/shared/interview-prompts/turn-records";
import type {
  PromptBillInput,
  InterviewConfig as PromptInterviewConfig,
  InterviewQuestion as PromptInterviewQuestion,
} from "@mirai-gikai/shared/interview-prompts/types";
import {
  generateObject,
  generateText,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import {
  LLM_MAX_ATTEMPTS,
  LLM_TIMEOUT_MS,
  type PromptKind,
  SIMULATION_MAX_TURNS,
} from "../../shared/constants";
import {
  type PersonaCharacterSheet,
  type SimGeneratedReport,
  type SimulatedTurn,
  simGeneratedReportSchema,
} from "../../shared/schemas";
import type { SimulationMetrics, SimulationRun } from "../../shared/types";
import { buildIntervieweeSystemPrompt } from "../../shared/utils/build-interviewee-system-prompt";
import type { OriginalStyleAnchors } from "../../shared/utils/extract-original-style-anchors";
import { isShortAnswer } from "../../shared/utils/format-transcript";
import { withTimeoutRetry } from "../../shared/utils/with-timeout-retry";

interface RunSimulatedInterviewParams {
  persona: PersonaCharacterSheet;
  interviewerModel?: LanguageModel;
  intervieweeModel?: LanguageModel;
  traceId: string;
  kind: PromptKind;
  /** 元インタビューから抽出した文体指標（省略可）。渡すとインタビュイー LLM の回答長を元会話レンジに寄せる */
  styleAnchors?: OriginalStyleAnchors;
  maxTurns?: number;
  /**
   * 本番と同じ builder を毎ターン呼んで system prompt を再構築するための素材。
   * handleInterviewChatRequest は毎ターン fresh に prompt をビルドするので、
   * シミュでもこの挙動を揃える。
   */
  promptInputs: {
    bill: PromptBillInput;
    interviewConfig: PromptInterviewConfig;
    questions: PromptInterviewQuestion[];
  };
  /** Summary フェーズ用モデル。省略時は明示された interviewerModel、両方未指定なら要約用の環境設定を使用 */
  summaryModel?: LanguageModel;
  /** 各ターン完了時に呼ばれるコールバック（ストリーミング進捗用） */
  onTurnComplete?: (turnIndex: number, turn: SimulatedTurn) => void;
  /** クライアント abort 時に LLM 呼び出しも停止させる */
  signal?: AbortSignal;
}

/**
 * 本番と同じ形で組み立てた assistant メッセージ（JSON）を、シミュの1ターンにする。
 * ターン制御に使うメタデータも同時に積む。
 */
function toSimulatedTurn(
  content: string,
  metas: AssistantTurnMeta[]
): SimulatedTurn {
  metas.push(readAssistantTurnMeta(content));
  const stored = JSON.parse(content) as {
    text: string;
    topic_title: string | null;
    question_id: string | null;
    next_stage: "chat" | "summary";
    quick_replies: string[];
  };
  return {
    role: "interviewer",
    content: stored.text,
    topic_title: stored.topic_title,
    question_id: stored.question_id,
    next_stage: stored.next_stage,
    quick_replies:
      stored.quick_replies.length > 0 ? stored.quick_replies : null,
  };
}

function asInterviewerMessages(turns: SimulatedTurn[]): ModelMessage[] {
  // 本番と同じ挙動に合わせる: assistant メッセージはプレーンテキストのみ渡す。
  // JSON 全体（topic_title / question_id 等）を渡すと、LLM が過去の話題文脈を
  // 強く保持しすぎて深掘りが止まらなくなる。話題の進捗は
  // system prompt 側の「いまの状況」節で LLM に伝える。
  return turns.map<ModelMessage>((t) => {
    if (t.role === "interviewer") {
      return { role: "assistant", content: t.content };
    }
    return { role: "user", content: t.content };
  });
}

function asIntervieweeMessages(turns: SimulatedTurn[]): ModelMessage[] {
  return turns.map<ModelMessage>((t) => {
    if (t.role === "interviewee") {
      return { role: "assistant", content: t.content };
    }
    // インタビュアー発話はそのまま user メッセージとして渡す。
    // quick_replies 情報は user メッセージには混ぜず、
    // インタビュイー LLM の system prompt 側で別途提示する
    //（本番ではユーザーが選択肢をタップするだけで suffix は付かないため）。
    return { role: "user", content: t.content };
  });
}

function computeMetrics(
  transcript: SimulatedTurn[],
  uniqueQuestionIds: Set<string>,
  questionsCount: number
): SimulationMetrics {
  const interviewerTurns = transcript.filter((t) => t.role === "interviewer");
  const intervieweeTurns = transcript.filter((t) => t.role === "interviewee");
  const shortAnswerCount = intervieweeTurns.filter((t) =>
    isShortAnswer(t.content)
  ).length;
  const sumChars = (turns: SimulatedTurn[]) =>
    turns.reduce((acc, t) => acc + t.content.length, 0);
  const avg = (sum: number, n: number) => (n === 0 ? 0 : Math.round(sum / n));

  return {
    totalTurns: transcript.length,
    interviewerTurns: interviewerTurns.length,
    intervieweeTurns: intervieweeTurns.length,
    shortAnswerCount,
    askedQuestionIds: [...uniqueQuestionIds],
    questionCoverage:
      questionsCount > 0 ? uniqueQuestionIds.size / questionsCount : 0,
    avgInterviewerChars: avg(
      sumChars(interviewerTurns),
      interviewerTurns.length
    ),
    avgIntervieweeChars: avg(
      sumChars(intervieweeTurns),
      intervieweeTurns.length
    ),
  };
}

/**
 * 元インタビュアーのターン数から、シミュのターン上限を算出する。
 * 元が短ければシミュも短く、元が長ければ元並みに（ただし hard cap を超えない）。
 * この値は LLM には伝えない（本番プロンプトをいじらないため）。純粋に実行側の安全装置。
 */
function deriveTargetMaxTurns(
  hardCap: number,
  originalInterviewerTurns: number | undefined,
  questionsCount: number
): number {
  const hasOriginal = (originalInterviewerTurns ?? 0) > 0;
  if (!hasOriginal) return hardCap;
  const target = Math.max(
    (originalInterviewerTurns ?? 0) + 1,
    Math.min(questionsCount + 1, hardCap)
  );
  return Math.min(target, hardCap);
}

export async function runSimulatedInterview({
  persona,
  interviewerModel,
  intervieweeModel,
  traceId,
  kind,
  styleAnchors,
  maxTurns = SIMULATION_MAX_TURNS,
  promptInputs,
  summaryModel,
  onTurnComplete,
  signal,
}: RunSimulatedInterviewParams): Promise<SimulationRun> {
  const interviewerSelection = getAiModel("interview", interviewerModel);
  const intervieweeSelection = getAiModel("simulation", intervieweeModel);
  const questionsCount = promptInputs.questions.length;
  const effectiveMaxTurns = deriveTargetMaxTurns(
    maxTurns,
    styleAnchors?.originalInterviewerTurns,
    questionsCount
  );
  const transcript: SimulatedTurn[] = [];
  const startedAt = Date.now();
  // インタビュイーが元の発言回数を超えないうちに自然に畳ませるための「予算」
  const intervieweeBudget = styleAnchors?.originalIntervieweeTurns;
  // 本番と同じターン制御（次に聞ける話題・発話の上限・要約への移行）を使う
  const topics = buildTurnTopics(promptInputs.questions);
  const metas: AssistantTurnMeta[] = [];

  let stopReason: SimulationRun["stopReason"] = "max_turns";
  // 1 ターン目の system prompt を結果に残す（UI で system prompt 確認用）
  let firstTurnSystemPrompt = "";

  // インタビュアーがリードするので、ターンはペア単位 (interviewer + interviewee) で進む
  for (let turnIndex = 0; turnIndex < effectiveMaxTurns; turnIndex++) {
    // --- インタビュアーの発話 ---
    // 本番の handleInterviewChatRequest と同じく、毎ターン状況を計算してから
    // system prompt を fresh にビルドする。
    const isInitialTurn = turnIndex === 0 && transcript.length === 0;
    const turnState = isInitialTurn
      ? null
      : computeTurnState({ topics, metas });
    if (
      turnState &&
      decideSummaryEntry({ state: turnState, endButton: false })
    ) {
      stopReason = "summary";
      break;
    }

    let interviewerTurn: SimulatedTurn;
    try {
      if (!turnState) {
        // 初回は本番 generateInitialQuestion と同じく、人物像＋初回指示だけで生成する
        const initialPrompt = await buildPublishedInitialPrompt({ topics });
        firstTurnSystemPrompt = initialPrompt;
        const { object } = await withTimeoutRetry(
          (attemptSignal) =>
            generateObject({
              ...interviewerSelection,
              schema: interviewInitialSchema,
              prompt: initialPrompt,
              abortSignal: attemptSignal,
              experimental_telemetry: {
                isEnabled: true,
                functionId: "sim-interviewer-initial",
                metadata: { traceId, kind, turnIndex: String(turnIndex) },
              },
            }),
          {
            externalSignal: signal,
            timeoutMs: LLM_TIMEOUT_MS.interviewTurn,
            maxAttempts: LLM_MAX_ATTEMPTS,
            label: "sim-interviewer-initial",
          }
        );
        // 本番と同じ保存内容の組み立てを使う（question_id・選択肢・話題名）
        interviewerTurn = toSimulatedTurn(
          buildInitialTurnContent({
            rawText: JSON.stringify(object),
            firstTopic: topics[0] ?? null,
          }),
          metas
        );
      } else {
        const systemPrompt = await buildPublishedInterviewPrompt({
          bill: promptInputs.bill,
          interviewConfig: promptInputs.interviewConfig,
          topics,
          turnState,
        });
        const messages = asInterviewerMessages(transcript);
        const { object } = await withTimeoutRetry(
          (attemptSignal) =>
            generateObject({
              ...interviewerSelection,
              schema: interviewChatTextSchema,
              system: systemPrompt,
              messages,
              abortSignal: attemptSignal,
              experimental_telemetry: {
                isEnabled: true,
                functionId: "sim-interviewer",
                metadata: {
                  traceId,
                  kind,
                  turnIndex: String(turnIndex),
                },
              },
            }),
          {
            externalSignal: signal,
            timeoutMs: LLM_TIMEOUT_MS.interviewTurn,
            maxAttempts: LLM_MAX_ATTEMPTS,
            label: "sim-interviewer",
          }
        );
        interviewerTurn = toSimulatedTurn(
          buildChatTurnRecord({
            rawText: JSON.stringify(object),
            state: turnState,
          }).content,
          metas
        );
      }
    } catch (error) {
      // 外部 abort はユーザー操作のキャンセルなのでエラーログに載せない。
      // 呼び出し側 (pipeline) に伝播させて全体を止める
      if (signal?.aborted) {
        console.warn("[Simulation] interviewer LLM aborted");
        throw error;
      }
      console.error("[Simulation] interviewer LLM failed:", error);
      stopReason = "interviewer_error";
      break;
    }

    transcript.push(interviewerTurn);
    onTurnComplete?.(turnIndex, interviewerTurn);
    if (interviewerTurn.next_stage === "summary") {
      stopReason = "summary";
      break;
    }
    const interviewerQuickReplies = interviewerTurn.quick_replies;

    // 最終イテレーションでは、インタビュイーの返答を生成せずに終了する。
    // → transcript は必ずインタビュアー発話で終わる。
    // これにより、max_turns 到達時でも「インタビュイーで終わる」挙動を構造的に排除できる。
    // 本番プロンプトには手を加えず、シミュレータ側の安全装置として実装。
    if (turnIndex === effectiveMaxTurns - 1) {
      break;
    }

    // --- インタビュイーの返答 ---
    // この発言が「何回目のインタビュイー発言」になるかをカウントしてプロンプトに反映。
    // 元の発言回数に近づいたら、インタビュイー LLM が自然に畳みにかかるように促す。
    // 直前のインタビュアー発話の quick_replies は system prompt 側で別途提示し、
    // user メッセージには混ぜない（本番と同じユーザー入力形式を保つため）。
    const intervieweeTurnNumber =
      transcript.filter((t) => t.role === "interviewee").length + 1;
    const intervieweeSystemPrompt = buildIntervieweeSystemPrompt(
      persona,
      styleAnchors,
      { intervieweeTurnNumber, expectedBudget: intervieweeBudget },
      interviewerQuickReplies
    );
    try {
      const messages = asIntervieweeMessages(transcript);
      const { text } = await withTimeoutRetry(
        (attemptSignal) =>
          generateText({
            ...intervieweeSelection,
            system: intervieweeSystemPrompt,
            messages,
            abortSignal: attemptSignal,
            experimental_telemetry: {
              isEnabled: true,
              functionId: "sim-interviewee",
              metadata: {
                traceId,
                kind,
                turnIndex: String(turnIndex),
                intervieweeTurnNumber: String(intervieweeTurnNumber),
              },
            },
          }),
        {
          externalSignal: signal,
          timeoutMs: LLM_TIMEOUT_MS.interviewTurn,
          maxAttempts: LLM_MAX_ATTEMPTS,
          label: "sim-interviewee",
        }
      );
      const intervieweeTurn: SimulatedTurn = {
        role: "interviewee",
        content: text.trim(),
      };
      transcript.push(intervieweeTurn);
      onTurnComplete?.(turnIndex, intervieweeTurn);
    } catch (error) {
      // 外部 abort はユーザー操作のキャンセルなのでエラーログに載せない。
      // 呼び出し側 (pipeline) に伝播させて全体を止める
      if (signal?.aborted) {
        console.warn("[Simulation] interviewee LLM aborted");
        throw error;
      }
      console.error("[Simulation] interviewee LLM failed:", error);
      stopReason = "interviewee_error";
      break;
    }
  }

  // Summary フェーズ: summary への自然遷移 or max_turns 到達時に
  // 本番と同じ buildSummarySystemPrompt で Summary LLM を呼び、構造化レポートを生成する。
  // max_turns でも要約を生成することで、常にレポートが得られるようにする。
  let generatedReport: SimGeneratedReport | null = null;
  if (stopReason === "summary" || stopReason === "max_turns") {
    try {
      const summaryMessages = transcript.map((t) => ({
        role: t.role === "interviewer" ? "assistant" : "user",
        content: t.content,
      }));
      const summarySystemPrompt = await buildPublishedSummaryPrompt({
        bill: promptInputs.bill,
        interviewConfig: promptInputs.interviewConfig,
        messages: summaryMessages,
        summaryState: computeSummaryState({
          topics,
          metas,
          phase: "first",
          forceClose: false,
        }),
      });
      const { object } = await withTimeoutRetry(
        (attemptSignal) =>
          generateObject({
            ...getAiModel("summary", summaryModel ?? interviewerModel),
            schema: simGeneratedReportSchema,
            system: summarySystemPrompt,
            prompt:
              "上記の会話履歴をもとに、スキーマに従ってレポートを JSON で生成してください。",
            abortSignal: attemptSignal,
            experimental_telemetry: {
              isEnabled: true,
              functionId: "sim-summary",
              metadata: { traceId, kind },
            },
          }),
        {
          externalSignal: signal,
          timeoutMs: LLM_TIMEOUT_MS.summary,
          maxAttempts: LLM_MAX_ATTEMPTS,
          label: "sim-summary",
        }
      );
      generatedReport = object;
    } catch (error) {
      console.warn("[Simulation] summary LLM failed:", error);
    }
  }

  return {
    promptKind: kind,
    interviewerSystemPrompt: firstTurnSystemPrompt,
    interviewerModel: interviewerSelection.modelId,
    intervieweeModel: intervieweeSelection.modelId,
    transcript,
    metrics: computeMetrics(
      transcript,
      new Set(
        metas
          .map((m) => m.questionId)
          .filter((id): id is string => !!id && id !== RESUME_TOPIC_ID)
      ),
      questionsCount
    ),
    stopReason,
    elapsedMs: Date.now() - startedAt,
    generatedReport,
  };
}
