import "server-only";

import { toPromptRelatedPolicies } from "@mirai-gikai/shared/interview-prompts/to-prompt-related-policies";
import type { PromptRelatedPolicyInput } from "@mirai-gikai/shared/interview-prompts/types";
import { unstable_cache } from "next/cache";
import { findPublishedBillContentsByIds } from "@/features/bills/server/repositories/bill-repository";
import type { BillWithContent } from "@/features/bills/shared/types";
import { getInterviewConfigWithPoliciesById } from "@/features/interview-config/server/loaders/get-interview-config-by-id";
import { selectRelatedPolicyIds } from "@/features/interview-config/shared/utils/interview-visibility";
import { CACHE_TAGS } from "@/lib/cache-tags";

export type BillWithRelatedPolicies = BillWithContent & {
  related_policies: PromptRelatedPolicyInput[];
};

/**
 * プロンプトに載せる施策に、同じ意見募集に紐づく他の公開済み施策を添える。
 *
 * 対話（初回・2問目以降）と情報開示ページで同じプロンプトになるよう、
 * 施策をプロンプトに渡す経路はすべてこれを通す。
 * 回答者が選んだ表示難易度に関係なく、他の施策は標準（normal）の本文を渡す。
 */
export async function withRelatedPolicies(
  bill: BillWithContent | null,
  interviewConfigId: string
): Promise<BillWithRelatedPolicies | null> {
  if (!bill) {
    return null;
  }

  const result = await getInterviewConfigWithPoliciesById(interviewConfigId);
  const policyIds = result
    ? selectRelatedPolicyIds(result.policies, bill.id)
    : [];

  return {
    ...bill,
    related_policies: await _getCachedRelatedPolicies(policyIds),
  };
}

// 対話は1メッセージごとにこの取得を通るため、施策本文と同じくキャッシュに載せる
const _getCachedRelatedPolicies = unstable_cache(
  async (policyIds: string[]): Promise<PromptRelatedPolicyInput[]> => {
    const rows = await findPublishedBillContentsByIds(policyIds, "normal");
    return toPromptRelatedPolicies(policyIds, rows);
  },
  ["related-policies-for-prompt"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS],
  }
);
