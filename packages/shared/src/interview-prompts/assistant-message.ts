import { parseStructuredOutput } from "./read-signals";
import type { AssistantTurnMeta } from "./turn-control";
import type { InterviewStage } from "./types";

const STAGES: readonly InterviewStage[] = ["chat", "summary", "summary_complete"];

function readStage(value: unknown): InterviewStage | null {
  return STAGES.find((stage) => stage === value) ?? null;
}

/**
 * assistant メッセージは、LLM の構造化出力にコードが決めた値を足した JSON 文字列で保存する。
 * question_id の抽出規約は DB 側の extract_assistant_question_id 関数と同期を保つこと。
 */
export function readAssistantTurnMeta(content: string): AssistantTurnMeta {
  const parsed = parseStructuredOutput(content);
  if (!parsed) return { questionId: null, stage: null };
  const questionId =
    typeof parsed.question_id === "string" && parsed.question_id
      ? parsed.question_id
      : typeof parsed.questionId === "string" && parsed.questionId
        ? parsed.questionId
        : null;
  return {
    questionId,
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
