import "server-only";

import type { ParentPolicyOptions } from "../../shared/types";
import {
  countChildPolicies,
  findTopLevelPolicies,
} from "../repositories/bill-edit-repository";

/**
 * 施策フォームの「親施策」セレクト用のデータ。
 * policyId は編集中の施策（新規作成時は null）。
 */
export async function getParentPolicyOptions(
  policyId: string | null
): Promise<ParentPolicyOptions> {
  const [options, childCount] = await Promise.all([
    findTopLevelPolicies(policyId),
    countChildPolicies(policyId),
  ]);

  return { options, hasChildren: childCount > 0 };
}
