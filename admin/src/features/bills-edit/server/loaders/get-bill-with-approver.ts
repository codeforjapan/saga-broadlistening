import "server-only";

import type { Bill } from "../../shared/types";
import { findAuthUserEmail } from "../repositories/bill-edit-repository";
import { getBillById } from "./get-bill-by-id";

/** 承認者のメールアドレス。分からなければ null（承認日時だけを出す） */
async function getApproverEmail(
  approvedBy: string | null
): Promise<string | null> {
  if (!approvedBy) return null;
  try {
    return await findAuthUserEmail(approvedBy);
  } catch (error) {
    console.error("Failed to fetch approver:", error);
    return null;
  }
}

/** 編集画面用に、施策と承認者のメールアドレスを取得する */
export async function getBillWithApprover(
  id: string
): Promise<{ bill: Bill | null; approverEmail: string | null }> {
  const bill = await getBillById(id);
  const approverEmail = await getApproverEmail(bill?.approved_by ?? null);
  return { bill, approverEmail };
}
