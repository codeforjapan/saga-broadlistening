"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import type { Bill } from "../../shared/types";
import {
  prepareBillContentsForDuplication,
  prepareBillForDuplication,
} from "../../shared/utils/prepare-bill-for-duplication";
import {
  createBill,
  createBillContents,
  findBillById,
  findBillContentsByBillId,
} from "../repositories/bill-repository";

/**
 * 施策を複製する
 * 元の施策とそのコンテンツを複製し、新しい施策として作成する
 */
export async function duplicateBill(billId: string) {
  await requireAdmin();

  // 元の施策を取得
  const originalBill = await _fetchOriginalBill(billId);
  if (!originalBill.success) {
    return originalBill;
  }

  // 新しい施策を作成
  const newBill = await _createDuplicateBill(originalBill.data);
  if (!newBill.success) {
    return newBill;
  }

  // コンテンツを複製
  const contentResult = await _duplicateContents(billId, newBill.data.id);
  if (!contentResult.success) {
    return contentResult;
  }

  revalidatePath("/bills");
  return { success: true, data: { billId: newBill.data.id } };
}

/**
 * 元の施策を取得
 */
async function _fetchOriginalBill(billId: string) {
  try {
    const data = await findBillById(billId);
    return { success: true as const, data };
  } catch (error) {
    console.error("Error fetching original bill:", error);
    return {
      success: false as const,
      error: "元の施策が見つかりません",
    };
  }
}

/**
 * 複製した施策を作成
 */
async function _createDuplicateBill(originalBill: Bill) {
  // policies.slug は NOT NULL かつ一意なため、複製時にランダムな接尾辞で採番する
  const newSlug = `${originalBill.slug}-copy-${randomBytes(4).toString("hex")}`;
  const insertData = prepareBillForDuplication(originalBill, newSlug);

  try {
    const data = await createBill(insertData);
    return { success: true as const, data };
  } catch (error) {
    console.error("Error creating new bill:", error);
    return {
      success: false as const,
      error: "新しい施策の作成に失敗しました",
    };
  }
}

/**
 * 施策のコンテンツを複製
 */
async function _duplicateContents(originalBillId: string, newBillId: string) {
  try {
    // 元のコンテンツを取得
    const originalContents = await findBillContentsByBillId(originalBillId);

    // コンテンツが存在しない場合は成功として扱う
    if (!originalContents || originalContents.length === 0) {
      return { success: true as const };
    }

    // コンテンツを複製用に整形
    const newContents = prepareBillContentsForDuplication(
      originalContents,
      newBillId
    );

    // 新しいコンテンツを挿入
    await createBillContents(newContents);

    return { success: true as const };
  } catch (error) {
    console.error("Error duplicating contents:", error);
    return {
      success: false as const,
      error: "コンテンツの複製に失敗しました",
    };
  }
}
