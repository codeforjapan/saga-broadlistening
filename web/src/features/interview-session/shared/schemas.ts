import type { ContentRichnessResult } from "@mirai-gikai/shared/content-richness/schemas";
import {
  interviewChatTextSchema,
  interviewChatWithReportSchema,
  interviewInitialSchema,
  SUMMARY_RESPONSES,
} from "@mirai-gikai/shared/interview-prompts/output-schemas";
import {
  type InterviewReportData,
  interviewReportSchema,
} from "@mirai-gikai/shared/interview-report/schema";
import { z } from "zod";

// 意見スキーマ・レポートスキーマ・LLM の出力スキーマは web/admin 共通のため
// @mirai-gikai/shared に集約。既存の web 内 import を壊さないよう re-export する。
export {
  interviewChatTextSchema,
  interviewChatWithReportSchema,
  interviewInitialSchema,
  interviewReportSchema,
};
export type { InterviewReportData };

export type InterviewContentRichness = ContentRichnessResult;

// クライアント表示用の型（content_richnessはユーザーには表示しない）
export type InterviewReportViewData = Omit<
  InterviewReportData,
  "content_richness"
>;

// ステージ遷移の型
export const interviewStageSchema = z.enum([
  "chat",
  "summary",
  "summary_complete",
]);
export type InterviewStage = z.infer<typeof interviewStageSchema>;

/**
 * クライアント側で使う統一スキーマ（対話・要約どちらのレスポンスも受け取れる）。
 * next_stage・quick_replies・resolved_question_id・chain_summary は、
 * LLM の出力を読み切った後にサーバーがストリームの末尾へ注入する。
 */
export const interviewChatResponseSchema = z.object({
  text: z.string(),
  report: interviewReportSchema.optional().nullable(),
  question_id: z.string().optional().nullable(),
  topic_title: z.string().optional().nullable(),
  summary_response: z.enum(SUMMARY_RESPONSES).optional(),
  end_request: z.boolean().optional(),
  wrap_up: z.boolean().optional(),
  /** サーバーが決めた question_id（interview_questions.id） */
  resolved_question_id: z.string().optional().nullable(),
  /** サーバーが決めた話題名 */
  resolved_topic_title: z.string().optional().nullable(),
  /** 初めて聞く質問の選択肢ボタン */
  quick_replies: z.array(z.string()).optional().nullable(),
  /** サーバーが決めた次のステージ */
  next_stage: interviewStageSchema.optional(),
  /** true なら、続けて初回の要約を取りにいく（end_request・最後の話題の wrap_up を受けたとき） */
  chain_summary: z.boolean().optional(),
});

export type InterviewChatResponse = z.infer<typeof interviewChatResponseSchema>;
