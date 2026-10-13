import { z } from "zod";
import { interviewReportSchema } from "../interview-report/schema";
import {
  INTERVIEW_CHAT_FIELD_DESCRIPTIONS,
  INTERVIEW_CHAT_TEXT_DESCRIPTION,
} from "./chat-text-description";

/**
 * AIインタビューの LLM 出力スキーマ。本番（web）とシミュレータ（admin）で共通に使う。
 * 構造化出力では question_id を先頭に置く（text のストリーミングを妨げない順）。
 */

// 対話（stage = chat）
export const interviewChatTextSchema = z.object({
  question_id: z.string().describe(INTERVIEW_CHAT_FIELD_DESCRIPTIONS.question_id),
  topic_title: z.string().describe(INTERVIEW_CHAT_FIELD_DESCRIPTIONS.topic_title),
  text: z.string().describe(INTERVIEW_CHAT_TEXT_DESCRIPTION),
  end_request: z.boolean().describe(INTERVIEW_CHAT_FIELD_DESCRIPTIONS.end_request),
});
export type InterviewChatText = z.infer<typeof interviewChatTextSchema>;

// 初回（1ターン目）。フラグはコードが false で埋める
export const interviewInitialSchema = interviewChatTextSchema.pick({
  question_id: true,
  topic_title: true,
  text: true,
});

export const SUMMARY_RESPONSES = [
  "none",
  "agree",
  "revise",
  "resume",
  "other",
] as const;

// 要約（stage = summary）
export const interviewChatWithReportSchema = z.object({
  text: z.string().describe("回答者に表示する本文"),
  summary_response: z
    .enum(SUMMARY_RESPONSES)
    .describe(INTERVIEW_CHAT_FIELD_DESCRIPTIONS.summary_response),
  report: interviewReportSchema
    .nullable()
    .describe(
      "インタビュー内容をまとめたレポート。resume でインタビューに戻るときは null にすること"
    ),
});
export type InterviewChatWithReport = z.infer<
  typeof interviewChatWithReportSchema
>;
