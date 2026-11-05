import type { InterviewConfigInput } from "../types";

export const NO_QUESTIONS_PUBLISH_ERROR =
  "質問が1件もないため、募集中にできません。質問を追加してから募集中にしてください。";

/**
 * 募集中にできるかを確かめ、できなければ理由を返す。
 * 質問が0件の意見募集は、最初の返事のあとすぐ要約に入ってしまうので公開しない。
 */
export function findPublishBlockReason({
  status,
  questionCount,
}: {
  status: InterviewConfigInput["status"];
  questionCount: number;
}): string | null {
  if (status === "open" && questionCount === 0) {
    return NO_QUESTIONS_PUBLISH_ERROR;
  }
  return null;
}
