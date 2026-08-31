import "server-only";

import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import type { BillUpdateInput } from "../../shared/types";
import { updateBillRecord } from "../repositories/bill-edit-repository";

/**
 * 施策の更新と、それに伴う副作用（キャッシュ無効化）を一括で実行する。
 * admin の server action と MCP の update_bill ツールから共通で呼び出す。
 * 部分更新に対応するため input は Partial で受ける（undefined フィールドは更新対象外）。
 */
export async function updateBillWithSideEffects(
  id: string,
  input: Partial<BillUpdateInput>
) {
  const definedFields = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );

  await updateBillRecord(id, {
    ...definedFields,
    updated_at: new Date().toISOString(),
  });

  await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
}
