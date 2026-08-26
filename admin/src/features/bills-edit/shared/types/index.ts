import type { Database } from "@mirai-gikai/supabase";
import { z } from "zod";

// Epic #54 で bills → policies に再定義された。bill という名前の改名は
// Epic #8 完了後のフォローアップで行う。
export type Bill = Database["public"]["Tables"]["policies"]["Row"];
export type BillUpdate = Database["public"]["Tables"]["policies"]["Update"];
export type BillInsert = Database["public"]["Tables"]["policies"]["Insert"];

// 公開ステータス型
export type BillPublishStatus = "draft" | "published";

// 共通のバリデーションスキーマ
const billBaseSchema = z.object({
  name: z
    .string()
    .min(1, "施策名は必須です")
    .max(200, "施策名は200文字以内で入力してください"),
  slug: z
    .string()
    .min(1, "slugは必須です")
    .max(200, "slugは200文字以内で入力してください"),
  department: z
    .string()
    .max(100, "担当部署は100文字以内で入力してください")
    .nullable()
    .optional(),
  contact: z
    .string()
    .max(500, "問い合わせ先は500文字以内で入力してください")
    .nullable()
    .optional(),
  thumbnail_url: z.string().nullable().optional(),
  share_thumbnail_url: z.string().nullable().optional(),
  is_featured: z.boolean(),
  knowledge_source: z
    .string()
    .max(40_000, "ナレッジソースは40,000文字以内で入力してください")
    .optional(),
  enable_ai_chat: z.boolean().optional(),
});

// 更新用スキーマ（既存）
export const billUpdateSchema = billBaseSchema;
export type BillUpdateInput = z.infer<typeof billUpdateSchema>;

// 新規作成用スキーマ
export const billCreateSchema = billBaseSchema;
export type BillCreateInput = z.infer<typeof billCreateSchema>;
