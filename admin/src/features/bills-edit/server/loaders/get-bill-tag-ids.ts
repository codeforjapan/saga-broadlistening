import { findBillTagIdsByBillId } from "../repositories/bill-edit-repository";

/**
 * 施策に紐づくタグIDの配列を取得する
 */
export async function getBillTagIds(billId: string): Promise<string[]> {
  return findBillTagIdsByBillId(billId);
}
