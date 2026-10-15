import "server-only";

import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import type { BillUpdateInput } from "../../shared/types";
import { resolvePolicyApproval } from "../../shared/utils/resolve-policy-approval";
import {
  findPolicyApproval,
  updateBillRecord,
} from "../repositories/bill-edit-repository";
import { assertValidPolicyParent } from "./assert-valid-policy-parent";

/**
 * 施策の更新と、それに伴う検証（親子関係）・副作用（キャッシュ無効化）を一括で実行する。
 * admin の server action と MCP の update_bill ツールから共通で呼び出す。
 * 部分更新に対応するため input は Partial で受ける（undefined フィールドは更新対象外）。
 * is_approved は列ではないので、actorId（操作した管理者）とともに承認の列へ変換する。
 */
export async function updateBillWithSideEffects(
  id: string,
  input: Partial<BillUpdateInput>,
  options: { actorId?: string } = {}
) {
  const { is_approved, ...rest } = input;
  // 承認済みのまま保存したときに元の日時・承認者を残すため、現在の値を読む
  const [current] = await Promise.all([
    is_approved ? findPolicyApproval(id) : null,
    assertValidPolicyParent(id, input.parent_policy_id),
  ]);

  const definedFields = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined)
  );
  const now = new Date();

  await updateBillRecord(id, {
    ...definedFields,
    ...resolvePolicyApproval({
      isApproved: is_approved,
      current,
      actorId: options.actorId,
      now,
    }),
    updated_at: now.toISOString(),
  });

  await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
}
