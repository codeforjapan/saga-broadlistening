import {
  parseStructuredOutput,
  readSignals,
} from "./read-signals";
import {
  type AssistantTurnMeta,
  buildQuickReplies,
  RESUME_TOPIC,
  RESUME_TOPIC_ID,
  resolveChatTurn,
  resolveSummaryTurn,
  type SummaryState,
  type SummaryTurnResult,
  type TurnState,
  type TurnTopic,
} from "./turn-control";
import type {
  InterviewEndReason,
  InterviewStage,
  SummaryPhase,
} from "./types";

/** レスポンスの末尾にサーバーが注入する値 */
export interface InjectedTurnFields {
  resolved_question_id: string | null;
  resolved_topic_title: string | null;
  quick_replies: string[];
  next_stage: InterviewStage;
  chain_summary: boolean;
}

/** interview_sessions に書き戻すステージ */
export interface SessionStageUpdate {
  stage: InterviewStage;
  summary_phase: SummaryPhase | null;
  resume_used?: boolean;
  end_reason?: InterviewEndReason;
}

export interface TurnRecord {
  /** interview_messages.content に保存する JSON 文字列 */
  content: string;
  injected: InjectedTurnFields;
  /** ステージが変わるときだけ */
  sessionUpdate: SessionStageUpdate | null;
}

function displayText(
  parsed: Record<string, unknown> | null,
  rawText: string
): string {
  return typeof parsed?.text === "string" ? parsed.text : rawText;
}

/**
 * chat の生成結果から、保存するメッセージと注入する値を作る。
 * 本文は表示済みなので作り直さず、question_id などコードが決める値だけを直す。
 */
export function buildChatTurnRecord({
  rawText,
  state,
  metas,
}: {
  rawText: string;
  state: TurnState;
  metas: AssistantTurnMeta[];
}): TurnRecord {
  const parsed = parseStructuredOutput(rawText);
  const signals = readSignals(parsed);
  const result = resolveChatTurn({
    state,
    metas,
    rawQuestionId: parsed?.question_id,
    sideTurn: signals.personalRequest || signals.offTopic,
  });
  const nextStage: InterviewStage = signals.endRequest ? "summary" : "chat";

  const stored = {
    ...parsed,
    text: displayText(parsed, rawText),
    question_id: result.questionId,
    topic_title: result.topicTitle,
    quick_replies: result.quickReplies,
    stage: "chat",
    next_stage: nextStage,
    end_request: signals.endRequest,
    personal_request: signals.personalRequest,
    off_topic: signals.offTopic,
    budget_exempt: result.budgetExempt,
    parse_failed: parsed === null,
  };

  return {
    content: JSON.stringify(stored),
    injected: {
      resolved_question_id: result.questionId,
      resolved_topic_title: result.topicTitle,
      quick_replies: result.quickReplies,
      next_stage: nextStage,
      chain_summary: signals.endRequest,
    },
    sessionUpdate: signals.endRequest
      ? { stage: "summary", summary_phase: "first", end_reason: "end_request" }
      : null,
  };
}

/**
 * summary の生成結果から、保存するメッセージ・注入する値・次のステージを作る。
 */
export function buildSummaryTurnRecord({
  rawText,
  summaryState,
}: {
  rawText: string;
  summaryState: SummaryState;
}): TurnRecord & { result: SummaryTurnResult } {
  const parsed = parseStructuredOutput(rawText);
  const { summaryResponse } = readSignals(parsed);
  const result = resolveSummaryTurn(summaryState, summaryResponse);
  const questionId = result.resumed ? RESUME_TOPIC_ID : null;
  const topicTitle = result.resumed ? RESUME_TOPIC.title : null;

  const stored = {
    ...parsed,
    text: displayText(parsed, rawText),
    // インタビューに戻るときはレポートを残さない（要約の提示と取り違えないため）
    ...(result.resumed ? { report: null } : {}),
    question_id: questionId,
    topic_title: topicTitle,
    quick_replies: [],
    stage: "summary",
    next_stage: result.stage,
    summary_response: summaryResponse,
    parse_failed: parsed === null,
  };

  return {
    result,
    content: JSON.stringify(stored),
    injected: {
      resolved_question_id: questionId,
      resolved_topic_title: topicTitle,
      quick_replies: [],
      next_stage: result.stage,
      chain_summary: false,
    },
    sessionUpdate: {
      stage: result.stage,
      summary_phase: result.summaryPhase,
      ...(result.resumed ? { resume_used: true } : {}),
    },
  };
}

/** 初回の発話の話題名。進捗バーには最初の話題名ではなくこれを出す */
export const INITIAL_TOPIC_TITLE = "はじめに";

/**
 * 初回の発話の保存内容を作る。question_id は最初の話題、選択肢ボタンを付ける。
 * 制御フラグはコードが false で埋める。
 */
export function buildInitialTurnContent({
  rawText,
  firstTopic,
}: {
  rawText: string;
  firstTopic: TurnTopic | null;
}): string {
  const parsed = parseStructuredOutput(rawText);
  return JSON.stringify({
    ...parsed,
    text: displayText(parsed, rawText),
    question_id: firstTopic?.id ?? null,
    topic_title: INITIAL_TOPIC_TITLE,
    quick_replies: firstTopic ? buildQuickReplies(firstTopic) : [],
    stage: "chat",
    next_stage: "chat",
    end_request: false,
    personal_request: false,
    off_topic: false,
    budget_exempt: false,
    parse_failed: parsed === null,
  });
}
