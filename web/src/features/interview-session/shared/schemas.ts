import { z } from "zod";
import type { ContentRichnessResult } from "@mirai-gikai/shared/content-richness/schemas";
import {
  type InterviewReportData,
  interviewReportSchema,
} from "@mirai-gikai/shared/interview-report/schema";

// 意見スキーマ・レポートスキーマは web/admin 共通のため @mirai-gikai/shared に集約。
// 既存の web 内 import を壊さないよう re-export する。
export { interviewReportSchema };
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

// 通常チャット用スキーマ（LLM出力用 - next_stageを含む）
export const interviewChatTextSchema = z.object({
  // gpt-oss は構造化出力をツール呼び出しで返すため、プロンプト本文より
  // 書く直前に読むこの説明のほうが効く。1ターン1問をここでも念押しする
  text: z
    .string()
    .describe(
      "利用者に見せる返答。直前の回答があれば受け止めの1〜2文を先に書く。質問は1つだけにし、「？」は1回までにする"
    ),
  quick_replies: z.array(z.string()).nullable(),
  question_id: z.string().nullable(),
  topic_title: z.string().nullable(),
  next_stage: interviewStageSchema.describe(
    "インタビューのステージ遷移判定。chat=インタビュー継続、summary=要約フェーズへ移行"
  ),
});

export type InterviewChatText = z.infer<typeof interviewChatTextSchema>;

// summaryフェーズ用スキーマ（LLM出力用 - next_stageを含む）
// chat遷移時はreportをnullにする（OpenAI structured outputはoptionalを許容しないためnullableを使用）
export const interviewChatWithReportSchema = z.object({
  text: z.string(),
  report: interviewReportSchema
    .nullable()
    .describe(
      "インタビュー内容をまとめたレポート。next_stageがchatの場合はnullにすること"
    ),
  next_stage: interviewStageSchema.describe(
    "ステージ遷移判定。summary=レポート修正継続、summary_complete=レポート完了、chat=インタビュー再開"
  ),
});

export type InterviewChatWithReport = z.infer<
  typeof interviewChatWithReportSchema
>;

// クライアント側で使う統一スキーマ（両方のレスポンスを受け取れる）
export const interviewChatResponseSchema = z.object({
  text: z.string(),
  report: interviewReportSchema.optional().nullable(),
  quick_replies: z.array(z.string()).optional().nullable(),
  question_id: z.string().optional().nullable(),
  topic_title: z.string().optional().nullable(),
  next_stage: interviewStageSchema.optional(),
});

export type InterviewChatResponse = z.infer<typeof interviewChatResponseSchema>;
