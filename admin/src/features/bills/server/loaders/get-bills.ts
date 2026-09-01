import type { Bill, BillSortConfig } from "../../shared/types";
import { findBills, findPolicyOptions } from "../repositories/bill-repository";

export async function getBills(sortConfig?: BillSortConfig): Promise<Bill[]> {
  const data = await findBills(sortConfig);
  return data || [];
}

/**
 * 意見募集に紐づける施策の選択肢。
 *
 * 取得に失敗しても空配列に倒さないこと。選択肢が空のまま保存されると、
 * 職員が意図せず紐づけを外したのと同じ結果になりうる。
 */
export async function getPolicyOptions(): Promise<
  { id: string; name: string }[]
> {
  return findPolicyOptions();
}
