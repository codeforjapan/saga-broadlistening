"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { deleteBillById } from "../repositories/bill-repository";

export async function deleteBill(id: string) {
  try {
    await requireAdmin();

    // 施策を削除
    await deleteBillById(id);

    // キャッシュをリフレッシュ
    revalidatePath("/bills");
  } catch (error) {
    console.error("Delete bill error:", error);
    throw new Error(
      getErrorMessage(error, "施策の削除中にエラーが発生しました")
    );
  }
}
