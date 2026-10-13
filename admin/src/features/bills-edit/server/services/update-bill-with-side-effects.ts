import "server-only";

import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import type { BillUpdateInput } from "../../shared/types";
import { updateBillRecord } from "../repositories/bill-edit-repository";
import { assertValidPolicyParent } from "./assert-valid-policy-parent";

/**
 * 施策の更新と、それに伴う検証（親子関係）・副作用（キャッシュ無効化）を一括で実行する。
 * admin の server action と MCP の update_bill ツールから共通で呼び出す。
 * 部分更新に対応するため input は Partial で受ける（undefined フィールドは更新対象外）。
 */
export async function updateBillWithSideEffects(
  id: string,
  input: Partial<BillUpdateInput>
) {
  await assertValidPolicyParent(id, input.parent_policy_id);

  const definedFields = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );

  await updateBillRecord(id, {
    ...definedFields,
    updated_at: new Date().toISOString(),
  });

  await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
}
