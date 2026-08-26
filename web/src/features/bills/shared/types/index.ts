import type { Database } from "@mirai-gikai/supabase";

// Epic #54 でテーブルが bills → policies に再定義された。
// ディレクトリ・型名（Bill*）の改名は Epic #8 完了後のフォローアップ。
// Database types
export type Bill = Database["public"]["Tables"]["policies"]["Row"];
export type BillInsert = Database["public"]["Tables"]["policies"]["Insert"];
export type BillUpdate = Database["public"]["Tables"]["policies"]["Update"];

export type BillContent =
  Database["public"]["Tables"]["policy_contents"]["Row"];
export type BillContentInsert =
  Database["public"]["Tables"]["policy_contents"]["Insert"];
export type BillContentUpdate =
  Database["public"]["Tables"]["policy_contents"]["Update"];

// 公開ステータス型（施策の公開/非公開を管理）
export type BillPublishStatus =
  Database["public"]["Enums"]["policy_publish_status"];

// Combined types for UI
export type BillTag = {
  id: string;
  label: string;
};

export type FeaturedTag = {
  id: string;
  label: string;
  priority: number;
};

export type BillWithContent = Bill & {
  bill_content?: BillContent;
  tags: BillTag[];
  featured_tag?: FeaturedTag;
  hasPublicInterview?: boolean;
};

// タグごとにグループ化された施策
export type BillsByTag = {
  tag: BillTag & { description?: string; priority: number };
  bills: BillWithContent[];
};
