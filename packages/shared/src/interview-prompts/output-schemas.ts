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
  personal_request: z
    .boolean()
    .describe(INTERVIEW_CHAT_FIELD_DESCRIPTIONS.personal_request),
  off_topic: z.boolean().describe(INTERVIEW_CHAT_FIELD_DESCRIPTIONS.off_topic),
});
export type InterviewChatText = z.infer<typeof interviewChatTextSchema>;

// 初回（1ターン目）。フラグはコードが false で埋める
export const interviewInitialSchema = interviewChatTextSchema.pick({
  question_id: true,
  topic_title: true,
  text: true,
});

/** 要約のレポートに足す項目（会話の制御には使わない） */
export const interviewReportExtrasShape = {
  topic_depth: z
    .array(
      z
        .object({
          topic: z.string().describe("話題の名前"),
          situation: z
            .enum(["none", "vague", "concrete"])
            .describe("状況・出来事の具体さ"),
          life_impact: z.boolean().describe("暮らしへの影響が語られたか"),
          reason_depth: z
            .enum(["none", "A", "C", "V"])
            .describe(
              "理由の深さ。A=行動の理由、C=それで得られること、V=その人にとって大事なこと"
            ),
          desired_state: z
            .string()
            .nullable()
            .describe("望む状態（本人の言葉で。なければ null）"),
        })
        .strict()
    )
    .describe("話題ごとの聞けた深さ。満たしていないことを欠陥として扱わない"),
  dk: z
    .array(
      z
        .object({
          topic: z.string().describe("「わからない」と答えた話題"),
          kind: z.enum([
            "not_aware",
            "cannot_articulate",
            "ambivalent",
            "unclear_question",
            "no_experience",
            "declined",
          ]),
        })
        .strict()
    )
    .describe("「わからない」の種類"),
  emergent_topics: z
    .array(z.string())
    .describe("事前の話題の外で出てきた話（本人の言葉で）"),
  side_requests: z
    .array(z.string())
    .describe(
      "個別の対応を求めた発言・テーマ外の市政の話（意見とは別に記録）"
    ),
};

export const interviewReportWithExtrasSchema = interviewReportSchema.extend(
  interviewReportExtrasShape
);

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
  report: interviewReportWithExtrasSchema
    .nullable()
    .describe(
      "インタビュー内容をまとめたレポート。resume でインタビューに戻るときは null にすること"
    ),
});
export type InterviewChatWithReport = z.infer<
  typeof interviewChatWithReportSchema
>;
