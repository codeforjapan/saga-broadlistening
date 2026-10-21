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
