import type { Database } from "@mirai-gikai/supabase";

// Epic #54 で bills → policies に再定義された。ディレクトリ名・型名の
// bill → policy 改名は Epic #8 完了後のフォローアップで行う。
export type Bill = Database["public"]["Tables"]["policies"]["Row"];
export type BillInsert = Database["public"]["Tables"]["policies"]["Insert"];
export type BillUpdate = Database["public"]["Tables"]["policies"]["Update"];

export type BillPublishStatus =
  Database["public"]["Enums"]["policy_publish_status"];

export type BillWithContent = Bill & {
  bill_content?: Database["public"]["Tables"]["policy_contents"]["Row"];
};

import type { SortConfig } from "@/lib/sort";

// ソート関連の型定義
export type BillSortField = "created_at" | "published_at";

export const BILL_SORT_FIELDS: readonly BillSortField[] = [
  "created_at",
  "published_at",
] as const;

export type BillSortConfig = SortConfig<BillSortField>;

export const DEFAULT_BILL_SORT: BillSortConfig = {
  field: "created_at",
  order: "desc",
};
