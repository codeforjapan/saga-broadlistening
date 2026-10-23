import "server-only";

import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import type { BillCreateInput } from "../../shared/types";
import { createBillRecord } from "../repositories/bill-edit-repository";
import { assertValidPolicyParent } from "./assert-valid-policy-parent";

/**
 * 施策の作成と、それに伴う検証（親子関係）・副作用（キャッシュ無効化）を一括で実行する。
 * admin の server action と MCP の create_bill ツールから共通で呼び出す。
 */
export async function createBillWithSideEffects(input: BillCreateInput) {
  await assertValidPolicyParent(null, input.parent_policy_id);
  const inserted = await createBillRecord(input);
  await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
  return inserted;
}
