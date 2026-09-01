import type { Database } from "@mirai-gikai/supabase";
import { z } from "zod";
import { isValidChatModel } from "../utils/chat-model-options";

// Database types
export type InterviewConfig =
  Database["public"]["Tables"]["interview_configs"]["Row"];
export type InterviewConfigInsert =
  Database["public"]["Tables"]["interview_configs"]["Insert"];
export type InterviewConfigUpdate =
  Database["public"]["Tables"]["interview_configs"]["Update"];

export type InterviewQuestion =
  Database["public"]["Tables"]["interview_questions"]["Row"];
export type InterviewQuestionInsert =
  Database["public"]["Tables"]["interview_questions"]["Insert"];
export type InterviewQuestionUpdate =
  Database["public"]["Tables"]["interview_questions"]["Update"];

// バリデーションスキーマ
export const interviewConfigSchema = z.object({
  name: z
    .string()
    .min(1, "設定名は必須です")
    .max(100, "設定名は100文字以内で入力してください"),
  slug: z
    .string()
    .min(1, "slugは必須です")
    .max(100, "slugは100文字以内で入力してください"),
  status: z.enum(["draft", "open", "closed"]),
  description: z
    .string()
    .max(4000, "説明は4,000文字以内で入力してください")
    .nullable()
    .optional(),
  chat_model: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || isValidChatModel(val), {
      message: "無効なAIモデルが指定されています",
    }),
  estimated_duration: z
    .number()
    .int("整数で入力してください")
    .min(1, "1分以上で設定してください")
    .max(180, "180分以内で設定してください")
    .nullable()
    .optional(),
  thumbnail_url: z.string().nullable().optional(),
  /**
   * 紐づける施策のID一覧。施策と意見募集は多対多で、0件（＝抽象テーマ型）も許容する。
   * 未指定（undefined）のときは紐付けを更新しない。施策配下の画面のように
   * 紐付けを扱わないフォームから保存しても、既存の紐付けを消さないため。
   */
  policy_ids: z.array(z.string().uuid()).optional(),
});

export const interviewQuestionSchema = z.object({
  question: z
    .string()
    .min(1, "質問文は必須です")
    .max(1000, "質問文は1000文字以内で入力してください"),
  follow_up_guide: z
    .string()
    .max(2000, "フォローアップ指針は2000文字以内で入力してください")
    .optional(),
  quick_replies: z.array(z.string().min(1)).optional(),
});

export const interviewQuestionsInputSchema = z.array(interviewQuestionSchema);

// 型定義
export type InterviewConfigInput = z.infer<typeof interviewConfigSchema>;
export type InterviewQuestionInput = z.infer<typeof interviewQuestionSchema>;
export type InterviewQuestionsInput = z.infer<
  typeof interviewQuestionsInputSchema
>;

export { arrayToText, textToArray } from "../utils/array-text-conversion";
