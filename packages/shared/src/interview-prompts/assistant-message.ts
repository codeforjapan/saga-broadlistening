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
  if (!parsed) return { questionId: null, budgetExempt: false, stage: null };
  const questionId =
    typeof parsed.question_id === "string" && parsed.question_id
      ? parsed.question_id
      : typeof parsed.questionId === "string" && parsed.questionId
        ? parsed.questionId
        : null;
  return {
    questionId,
    budgetExempt: parsed.budget_exempt === true,
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

/** システムが自動で伏せた個人情報（[電話番号] など） */
const MASKED_PII_PATTERN =
  /\[(電話番号|氏名|名前|住所|メールアドレス|メール|生年月日|個人情報)[^\]\[]{0,20}\]/;

export function containsMaskedPii(text: string): boolean {
  return MASKED_PII_PATTERN.test(text);
}

/**
 * 伏せ字の案内が済んだか。伏せ字が一度も無ければ null（案内の行ごと省く）。
 * 伏せ字を含む発言の後に AI が一度でも返していれば、案内は済んだものとする。
 */
export function resolvePiiNotice(
  messages: Array<{ role: string; content: string }>
): "pending" | "done" | null {
  const firstMasked = messages.findIndex(
    (m) => m.role === "user" && containsMaskedPii(m.content)
  );
  if (firstMasked === -1) return null;
  const answeredAfter = messages
    .slice(firstMasked + 1)
    .some((m) => m.role === "assistant");
  return answeredAfter ? "done" : "pending";
}
