import "server-only";

import { validatePolicyParent } from "../../shared/utils/validate-policy-parent";
import {
  countChildPolicies,
  findPolicyParentRef,
} from "../repositories/bill-edit-repository";

/**
 * 親施策の指定が1階層のルールを守っているかを確かめ、守っていなければ例外を投げる。
 * parentPolicyId が undefined（更新対象外）または null（親を外す）のときは何もしない。
 */
export async function assertValidPolicyParent(
  policyId: string | null,
  parentPolicyId: string | null | undefined
) {
  if (parentPolicyId == null) return;

  const [parent, childCount] = await Promise.all([
    findPolicyParentRef(parentPolicyId),
    countChildPolicies(policyId),
  ]);

  const error = validatePolicyParent({
    policyId,
    parentPolicyId,
    parent,
    childCount,
  });
  if (error) {
    throw new Error(error);
  }
}
