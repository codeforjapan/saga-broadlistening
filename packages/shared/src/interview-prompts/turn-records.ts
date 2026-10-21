import { parseStructuredOutput, readSignals } from "./read-signals";
import {
  buildQuickReplies,
  decideChatExit,
  resolveChatTurn,
  type TurnState,
  type TurnTopic,
} from "./turn-control";
import type { InterviewStage } from "./types";

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
 * 進捗バーに出す話題名。LLM が出力した topic_title が空でなければそれを使う。
 * 話題名はコードでは決めない（interview_questions に名前の列が無いため）。
 */
export function readTopicTitle(
  parsed: Record<string, unknown> | null
): string | null {
  const title = parsed?.topic_title;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

/**
 * chat の生成結果から、保存するメッセージと注入する値を作る。
 * 本文は表示済みなので作り直さず、question_id などコードが決める値だけを直す。
 */
export function buildChatTurnRecord({
  rawText,
  state,
}: {
  rawText: string;
  state: TurnState;
}): TurnRecord {
  const parsed = parseStructuredOutput(rawText);
  const signals = readSignals(parsed);
  const result = resolveChatTurn({
    state,
    rawQuestionId: parsed?.question_id,
  });
  const toSummary = decideChatExit({ state, signals });
  const nextStage: InterviewStage = toSummary ? "summary" : "chat";
  const topicTitle = readTopicTitle(parsed);

  const stored = {
    ...parsed,
    text: displayText(parsed, rawText),
    question_id: result.questionId,
    topic_title: topicTitle,
    quick_replies: result.quickReplies,
    stage: "chat",
    next_stage: nextStage,
    end_request: signals.endRequest,
    wrap_up: signals.wrapUp,
    parse_failed: parsed === null,
  };

  return {
    content: JSON.stringify(stored),
    injected: {
      resolved_question_id: result.questionId,
      resolved_topic_title: topicTitle,
      quick_replies: result.quickReplies,
      next_stage: nextStage,
      chain_summary: toSummary,
    },
    sessionUpdate: toSummary ? { stage: "summary" } : null,
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
    wrap_up: false,
    parse_failed: parsed === null,
  });
}
