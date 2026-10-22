import { parseStructuredOutput } from "./read-signals";
import type { AssistantTurnMeta } from "./turn-control";
import { INTERVIEW_STAGES, type InterviewStage } from "./types";

function readStage(value: unknown): InterviewStage | null {
  return INTERVIEW_STAGES.find((stage) => stage === value) ?? null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/**
 * assistant メッセージは、LLM の構造化出力にコードが決めた値を足した JSON 文字列で保存する。
 * question_id の抽出規約は DB 側の extract_assistant_question_id 関数と同期を保つこと。
 */
export function readAssistantTurnMeta(content: string): AssistantTurnMeta {
  const parsed = parseStructuredOutput(content);
  if (!parsed) return { questionId: null, stage: null };
  return {
    // 旧形式の発話は questionId で保存されている
    questionId:
      readNonEmptyString(parsed.question_id) ??
      readNonEmptyString(parsed.questionId),
    stage: readStage(parsed.stage),
  };
}

export function collectAssistantTurnMetas(
  messages: Array<{ role: string; content: string }>
): AssistantTurnMeta[] {
  return messages
    .filter((m) => m.role === "assistant")
    .map((m) => readAssistantTurnMeta(m.content));
}

/** 保存した assistant 発話に付けた選択肢ボタン。無い・読めないときは空 */
export function readAssistantQuickReplies(content: string): string[] {
  const replies = parseStructuredOutput(content)?.quick_replies;
  if (!Array.isArray(replies)) return [];
  return replies.filter((r): r is string => typeof r === "string");
}

/**
 * 回答が、直前の発話の選択肢ボタンの文言そのものなら、その選択肢。
 * ボタンの文言は「自分が」のように助詞で終わることがあり、
 * 途中で切れた文と取り違えないよう、プロンプトで押した答えだと伝えるのに使う。
 */
export function matchQuickReply(
  quickReplies: readonly string[],
  answer: string | null | undefined
): string | null {
  const trimmed = answer?.trim();
  if (!trimmed) return null;
  return quickReplies.find((r) => r.trim() === trimmed) ?? null;
}

/**
 * 保存済みの会話（assistant は JSON）の末尾の回答が、直前の発話の選択肢ボタンなら、その選択肢。
 * 末尾が回答でない（再開直後など）ときは null。
 */
export function findSelectedQuickReply(
  messages: Array<{ role: string; content: string }>
): string | null {
  const answer = messages.at(-1);
  if (answer?.role !== "user") return null;
  const question = [...messages].reverse().find((m) => m.role === "assistant");
  return matchQuickReply(
    question ? readAssistantQuickReplies(question.content) : [],
    answer.content
  );
}
