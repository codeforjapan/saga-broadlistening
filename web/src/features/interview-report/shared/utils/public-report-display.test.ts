import { MIN_PUBLIC_OPINIONS_FOR_DISPLAY } from "@mirai-gikai/shared/report-publication/auto-publish";
import { describe, expect, it } from "vitest";
import {
  buildPublicReportsPage,
  canViewReportWithMessages,
  countUserMessageCharacters,
  getBillIdFromPublicReportSession,
  type PublicInterviewReport,
  selectPrimaryBillContent,
} from "./public-report-display";

function rawReport(id: string): PublicInterviewReport {
  return {
    id,
    role_title: "会社員",
    summary: `summary-${id}`,
    final_text: `final-${id}`,
    total_content_richness: 72,
    created_at: "2026-05-06T00:00:00.000Z",
  };
}

describe("public report display utilities", () => {
  it("ページサイズを超える公開意見は hasMore を立てて切り詰める", () => {
    const result = buildPublicReportsPage(
      [rawReport("opinion-1"), rawReport("opinion-2")],
      1
    );

    expect(result).toEqual({
      reports: [rawReport("opinion-1")],
      hasMore: true,
    });
  });

  it("意見のセッションから施策IDを取り出す（多対多は最初の1件）", () => {
    expect(
      getBillIdFromPublicReportSession({
        started_at: "2026-05-06T00:00:00.000Z",
        completed_at: null,
        interview_config_id: "config-1",
        interview_configs: {
          policies_interview_configs: [
            { policy_id: "policy-1" },
            { policy_id: "policy-2" },
          ],
        },
      })
    ).toBe("policy-1");
    expect(
      getBillIdFromPublicReportSession({
        started_at: "2026-05-06T00:00:00.000Z",
        completed_at: null,
        interview_config_id: "config-1",
        interview_configs: { policies_interview_configs: [] },
      })
    ).toBeNull();
  });

  it("policy_contents の配列・単体・null を表示用に正規化する", () => {
    expect(selectPrimaryBillContent([{ title: "施策タイトル" }])).toEqual({
      title: "施策タイトル",
    });
    expect(selectPrimaryBillContent({ title: "単体タイトル" })).toEqual({
      title: "単体タイトル",
    });
    expect(selectPrimaryBillContent(null)).toBeNull();
  });

  it("ユーザーメッセージだけの文字数を数える", () => {
    expect(
      countUserMessageCharacters([
        { role: "user", content: "abc" },
        { role: "assistant", content: "ignored" },
        { role: "user", content: "de" },
      ])
    ).toBe(5);
  });

  it("所有者は公開件数ゲートを迂回し、非所有者は公開状態と件数を満たす必要がある", () => {
    expect(
      canViewReportWithMessages({
        isOwner: true,
        reviewStatus: "pending_review",
        publicOpinionCount: 0,
      })
    ).toBe(true);
    expect(
      canViewReportWithMessages({
        isOwner: false,
        reviewStatus: "published",
        publicOpinionCount: MIN_PUBLIC_OPINIONS_FOR_DISPLAY,
      })
    ).toBe(true);
    expect(
      canViewReportWithMessages({
        isOwner: false,
        reviewStatus: "published",
        publicOpinionCount: MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 1,
      })
    ).toBe(false);
  });
});
