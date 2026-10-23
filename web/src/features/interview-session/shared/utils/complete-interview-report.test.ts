import { describe, expect, it } from "vitest";
import type { InterviewReportData } from "../schemas";
import {
  buildCompletedInterviewReportInsert,
  buildCompletedOpinionSources,
} from "./complete-interview-report";

const reportData = {
  summary: "賛成の立場",
  final_text: "この施策には賛成です。理由は社会全体の利益になるからです。",
  role_description: "一般市民として関心がある",
  role_title: "会社員",
  opinions: [
    {
      title: "賛成の理由",
      content: "社会全体の利益になる",
      source_message_id: "message-user-1",
      contextual_quote: null,
      richness: 70,
      concern: null,
      proposal: null,
      reasoning_types: null,
    },
  ],
  content_richness: {
    total: 70,
    clarity: 80,
    specificity: 60,
    impact: 70,
    constructiveness: 65,
    reasoning: "具体的な理由がある",
  },
} satisfies InterviewReportData;

describe("buildCompletedInterviewReportInsert", () => {
  it("ユーザー公開許可とスコア条件を満たす意見を公開済みにする", () => {
    const insert = buildCompletedInterviewReportInsert({
      sessionId: "session-1",
      reportData,
      moderationScore: 29,
      moderationReasoning: "問題なし",
      isPublicByUser: true,
    });

    expect(insert).toEqual(
      expect.objectContaining({
        interview_session_id: "session-1",
        final_text:
          "この施策には賛成です。理由は社会全体の利益になるからです。",
        summary: "賛成の立場",
        is_public_by_user: true,
        is_public_by_admin: true,
        review_status: "published",
        moderation_score: 29,
        moderation_reasoning: "問題なし",
        // 完了時は再抽出ウォーターマークを未処理へ戻す（再完了後もバックフィルで復旧可能にする）
        opinions_reextracted_at: null,
      })
    );
  });

  it("ユーザー公開許可がない場合は公開フラグを付与しない", () => {
    const insert = buildCompletedInterviewReportInsert({
      sessionId: "session-1",
      reportData,
      moderationScore: 29,
      moderationReasoning: "問題なし",
      isPublicByUser: false,
    });

    expect(insert).toEqual(
      expect.objectContaining({
        is_public_by_user: false,
      })
    );
    expect(insert).not.toHaveProperty("is_public_by_admin");
    expect(insert).not.toHaveProperty("review_status");
  });

  it("公開設定未指定のときは公開・二次利用のフラグを含めない", () => {
    const insert = buildCompletedInterviewReportInsert({
      sessionId: "session-1",
      reportData,
      moderationScore: null,
      moderationReasoning: null,
    });

    expect(insert).not.toHaveProperty("is_public_by_user");
    expect(insert).not.toHaveProperty("is_public_by_admin");
    expect(insert).not.toHaveProperty("is_data_reuse_consented");
  });

  it.each([
    true,
    false,
  ])("二次利用許諾の指定(%s)を保存用payloadへ反映する", (isDataReuseConsented) => {
    const insert = buildCompletedInterviewReportInsert({
      sessionId: "session-1",
      reportData,
      moderationScore: 29,
      moderationReasoning: "問題なし",
      isPublicByUser: true,
      isDataReuseConsented,
    });

    expect(insert).toEqual(
      expect.objectContaining({
        is_data_reuse_consented: isDataReuseConsented,
      })
    );
  });
});

describe("buildCompletedOpinionSources", () => {
  it("根拠IDに対応するユーザーメッセージ本文を補完する", () => {
    expect(
      buildCompletedOpinionSources({
        reportData,
        messages: [
          {
            id: "message-assistant-1",
            role: "assistant",
            content: JSON.stringify({ report: reportData }),
          },
          {
            id: "message-user-1",
            role: "user",
            content: "この施策に賛成です",
          },
        ],
      })
    ).toEqual([
      expect.objectContaining({
        source_message_content: "この施策に賛成です",
      }),
    ]);
  });

  it("根拠IDがユーザーメッセージに解決できない場合は根拠をnullへ正規化する", () => {
    expect(
      buildCompletedOpinionSources({
        reportData,
        messages: [
          {
            id: "message-user-1",
            role: "assistant",
            content: "assistantの本文",
          },
        ],
      })
    ).toEqual([
      expect.objectContaining({
        source_message_id: null,
        source_message_content: null,
      }),
    ]);
  });
});
