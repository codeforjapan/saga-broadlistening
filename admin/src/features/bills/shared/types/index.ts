import type { Database } from "@mirai-gikai/supabase";

export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
export type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];

export type BillStatus = Database["public"]["Enums"]["bill_status_enum"];
export type BillPublishStatus =
  Database["public"]["Enums"]["bill_publish_status"];
export type OriginatingHouse = Database["public"]["Enums"]["house_enum"];

export type BillWithContent = Bill & {
  bill_content?: Database["public"]["Tables"]["bill_contents"]["Row"];
};

export type BillWithDietSession = Bill & {
  diet_sessions: { name: string } | null;
};

import type { SortConfig } from "@/lib/sort";

// ソート関連の型定義
export type BillSortField =
  | "created_at"
  | "submitted_date"
  | "status_order"
  | "publish_status_order";

export const BILL_SORT_FIELDS: readonly BillSortField[] = [
  "created_at",
  "submitted_date",
  "status_order",
  "publish_status_order",
] as const;

export type BillSortConfig = SortConfig<BillSortField>;

export const DEFAULT_BILL_SORT: BillSortConfig = {
  field: "created_at",
  order: "desc",
};

// ステータスのソート順（DBのstatus_order generated columnと一致させる）
export const BILL_STATUS_ORDER: Record<BillStatus, number> = {
  enacted: 0,
  rejected: 1,
  in_receiving_house: 2,
  in_originating_house: 3,
  introduced: 4,
  preparing: 5,
};

/**
 * 議案の提出元区分。
 *
 * DB の `house_enum`（HR / HC）は国会の衆議院・参議院を表す値だったが、
 * 市議会は一院制のため、市議会の提出区分（市長提出 / 議員提出）として読み替えている。
 * **暫定の再定義であり、佐賀市の確認待ち**（#20）。enum値そのものの再定義が必要と
 * 判断された場合はマイグレーションを伴うため、フォローアップIssueで扱う。
 */
export const HOUSE_LABELS: Record<OriginatingHouse, string> = {
  HR: "市長提出",
  HC: "議員提出",
};

// ステータスを日本語ラベルに変換する関数
export function getBillStatusLabel(status: BillStatus): string {
  switch (status) {
    case "preparing":
      return "準備中";
    case "introduced":
      return "提出済み";
    case "in_originating_house":
      return "委員会審査中";
    case "in_receiving_house":
      return "本会議審議中";

    case "enacted":
      return "成立";
    case "rejected":
      return "否決";
    default:
      return status;
  }
}
