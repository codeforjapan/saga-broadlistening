"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { routes } from "@/lib/routes";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { type BillCreateInput, billCreateSchema } from "../../shared/types";
import { createBillWithSideEffects } from "../services/create-bill-with-side-effects";

export async function createBill(input: BillCreateInput) {
  try {
    // 管理者権限チェック
    const admin = await requireAdmin();

    // バリデーション
    const validatedData = billCreateSchema.parse(input);

    // 親子関係の検証・挿入・web側のキャッシュ無効化
    await createBillWithSideEffects(validatedData, { actorId: admin.id });
  } catch (error) {
    console.error("Create bill error:", error);
    throw new Error(
      getErrorMessage(error, "施策の作成中にエラーが発生しました")
    );
  }

  // 成功したら一覧ページへリダイレクト
  redirect(routes.bills());
}
