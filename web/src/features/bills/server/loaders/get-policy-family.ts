import "server-only";

import { unstable_cache } from "next/cache";
import { findKikaseteThemesByPolicyId } from "@/features/interview-config/server/repositories/interview-config-repository";
import {
  type KikaseteInterview,
  toKikaseteInterview,
} from "@/features/interview-config/shared/utils/kikasete-interview";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  type ChildPolicyCardView,
  toChildPolicyCardView,
} from "../../shared/utils/child-policy-card";
import {
  isParentPolicy,
  type PolicyHierarchyRef,
  selectPrimaryThemeForPolicy,
} from "../../shared/utils/policy-hierarchy";
import { findPublishedChildPolicies } from "../repositories/bill-repository";

export type PolicyFamily =
  | { kind: "standard" | "child" }
  | {
      kind: "parent";
      children: ChildPolicyCardView[];
      /** 親施策につながるテーマ（きかせて・トピック・まとめの軸）。なければ null */
      interview: KikaseteInterview | null;
    };

const getCachedParentPolicyData = unstable_cache(
  async (policyId: string) => {
    const children = await findPublishedChildPolicies(policyId);
    // テーマは親施策ページでだけ使うので、子を持たない施策では取得しない
    const themes =
      children.length > 0 ? await findKikaseteThemesByPolicyId(policyId) : [];
    return { children, themes };
  },
  ["parent-policy-data"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS, CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);

/**
 * 施策ページの種類（親・子・通常）と、親施策ページに出す関連施策・テーマを決める。
 */
export async function getPolicyFamily(
  policy: PolicyHierarchyRef & { id: string }
): Promise<PolicyFamily> {
  // 子施策は子を持てない（1階層まで）ので、親の判定に子の取得は要らない
  if (policy.parent_policy_id !== null) {
    return { kind: "child" };
  }

  const { children, themes } = await getCachedParentPolicyData(policy.id);
  if (!isParentPolicy(policy, children)) {
    return { kind: "standard" };
  }

  const theme = selectPrimaryThemeForPolicy(themes);
  return {
    kind: "parent",
    children: children.map(toChildPolicyCardView),
    interview: theme ? toKikaseteInterview(theme) : null,
  };
}
