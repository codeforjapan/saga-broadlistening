import "server-only";

import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import type { BillCreateInput } from "../../shared/types";
import { resolvePolicyApproval } from "../../shared/utils/resolve-policy-approval";
import { createBillRecord } from "../repositories/bill-edit-repository";
import { assertValidPolicyParent } from "./assert-valid-policy-parent";

/**
 * 施策の作成と、それに伴う検証（親子関係）・副作用（キャッシュ無効化）を一括で実行する。
 * admin の server action と MCP の create_bill ツールから共通で呼び出す。
 * is_approved は列ではないので、actorId（操作した管理者）とともに承認の列へ変換する。
 */
export async function createBillWithSideEffects(
  input: BillCreateInput,
  options: { actorId?: string } = {}
) {
  await assertValidPolicyParent(null, input.parent_policy_id);
  const { is_approved, ...rest } = input;
  const inserted = await createBillRecord({
    ...rest,
    ...resolvePolicyApproval({
      isApproved: is_approved,
      current: null,
      actorId: options.actorId,
      now: new Date(),
    }),
  });
  await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
  return inserted;
}
