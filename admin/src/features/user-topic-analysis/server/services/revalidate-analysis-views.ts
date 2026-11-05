import "server-only";

import { revalidatePath } from "next/cache";
import { getLinkedPolicyIds } from "@/features/interview-config/server/loaders/get-linked-policy-ids";
import { routes } from "@/lib/routes";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";

/**
 * トピック分析の公開状態が変わったあとに、表示側のキャッシュを落とす。
 *
 * - Admin: 同じ画面がテーマ配下と施策配下の2つのURLから見えるため両方を revalidate する
 *   （施策配下のURLは紐づく施策の数だけある）。
 * - Web: 公開状態はテーマ一覧（募集終了セクション）やテーマ解決の
 *   unstable_cache に乗るため、意見募集のタグを落として反映を待たせない。
 */
export async function revalidateAnalysisViews(
  interviewConfigId: string
): Promise<void> {
  revalidatePath(routes.interviewUserTopicAnalysis(interviewConfigId));

  const policyIds = await getLinkedPolicyIds(interviewConfigId);
  for (const policyId of policyIds) {
    revalidatePath(routes.billUserTopicAnalysis(policyId));
  }

  await invalidateWebCache([WEB_CACHE_TAGS.INTERVIEW_CONFIGS]);
}
