import type { Bill, BillInsert } from "../types";

/**
 * 施策データから複製用のinsertデータを生成する
 * ID・タイムスタンプを除去し、名前に「(複製)」を付与、ステータスをdraftに設定
 *
 * slug は一意制約かつNOT NULLのため、呼び出し側で採番した値を渡す
 */
export function prepareBillForDuplication(
  originalBill: Bill,
  newSlug: string
): BillInsert {
  const {
    id: _,
    created_at: __,
    updated_at: ___,
    slug: ____,
    ...billWithoutId
  } = originalBill;

  return {
    ...billWithoutId,
    slug: newSlug,
    name: `${originalBill.name} (複製)`,
    publish_status: "draft",
    published_at: null,
    approved_by: null,
    approved_at: null,
  };
}

/**
 * 施策コンテンツ配列から複製用のデータを生成する
 * IDを除去し、新しいbill_idを設定
 */
export function prepareBillContentsForDuplication<
  T extends { id: string; policy_id: string },
>(
  contents: T[],
  newBillId: string
): (Omit<T, "id" | "policy_id"> & { policy_id: string })[] {
  return contents.map((content) => {
    const { id: _, policy_id: __, ...contentData } = content;
    return {
      ...contentData,
      policy_id: newBillId,
    };
  });
}
