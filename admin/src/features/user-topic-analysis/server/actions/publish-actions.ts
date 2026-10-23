"use server";

import { setVersionPublished } from "@mirai-gikai/topic-analysis-core/repository";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { revalidateAnalysisViews } from "../services/revalidate-analysis-views";

/** Admin による version の公開／非公開切替（§7）。 */
export async function setVersionPublishedAction(input: {
  versionId: string;
  interviewConfigId: string;
  published: boolean;
}): Promise<void> {
  await requireAdmin();
  await setVersionPublished(input.versionId, input.published);
  await revalidateAnalysisViews(input.interviewConfigId);
}
