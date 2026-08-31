import type {
  OpenDataBillDetail,
  OpenDataBillItem,
} from "../types/open-data-bills";

// Epic #54 で bills → policies に再定義され、審議状況・提出議院・
// 賛否スタンス機能は廃止された。ファイル名・関数名（*Bill*）の改名は
// Epic #8 完了後のフォローアップ。

export type OpenDataBillRow = {
  id: string;
  name: string;
  slug: string;
  department: string | null;
  contact: string | null;
  published_at: string | null;
  created_at: string;
  /** 難易度で絞り込み済みのため実質1件 */
  policy_contents: { title: string; summary: string | null }[];
  policies_tags: { tags: { id: string; label: string } | null }[];
};

/**
 * DBの施策行をオープンデータAPIのレスポンス項目に変換する。
 */
export function toOpenDataBillItem(row: OpenDataBillRow): OpenDataBillItem {
  const billContent = row.policy_contents[0];
  return {
    billId: row.id,
    name: row.name,
    slug: row.slug,
    title: billContent?.title ?? "",
    summary: billContent?.summary ?? "",
    department: row.department,
    contact: row.contact,
    publishedAt: row.published_at,
    tags: row.policies_tags.flatMap((billTag) =>
      billTag.tags ? [{ id: billTag.tags.id, label: billTag.tags.label }] : []
    ),
    createdAt: row.created_at,
  };
}

export type OpenDataBillDetailRow = Omit<OpenDataBillRow, "policy_contents"> & {
  policy_contents: {
    title: string;
    summary: string | null;
    content: string;
  }[];
};

/**
 * DBの施策行（本文付き）をオープンデータAPIの詳細レスポンスに変換する。
 */
export function toOpenDataBillDetail(
  row: OpenDataBillDetailRow
): OpenDataBillDetail {
  return {
    ...toOpenDataBillItem(row),
    content: row.policy_contents[0]?.content ?? "",
  };
}
