"use server";

import { deleteTopic } from "@mirai-gikai/topic-analysis-core/repository";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { revalidateAnalysisViews } from "../services/revalidate-analysis-views";

/** Admin による個別トピック削除（LLM の誤割当トピックを取り除く手動操作）。 */
export async function deleteTopicAction(input: {
  topicId: string;
  versionId: string;
  interviewConfigId: string;
}): Promise<void> {
  await requireAdmin();
  await deleteTopic(input.topicId, input.versionId);
  await revalidateAnalysisViews(input.interviewConfigId);
}
