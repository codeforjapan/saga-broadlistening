import { MIN_PUBLIC_OPINIONS_FOR_DISPLAY } from "@mirai-gikai/shared/report-publication/auto-publish";
import { describe, expect, it } from "vitest";
import {
  buildPublicReportsPage,
  canViewReportWithMessages,
  countUserMessageCharacters,
  getReportOrigin,
  getReportOriginLink,
  type PublicInterviewReport,
  type ReportOrigin,
  resolveReportSubject,
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

  it("意見のセッションから起点の施策とテーマを取り出す（多対多は公開済みの最初の1件）", () => {
    expect(
      getReportOrigin({
        started_at: "2026-05-06T00:00:00.000Z",
        completed_at: null,
        interview_config_id: "config-1",
        interview_configs: {
          slug: "saga-no-mirai",
          name: "佐賀市のみらい",
          status: "open",
          policies_interview_configs: [
            { policies: { id: "policy-1", publish_status: "draft" } },
            { policies: { id: "policy-2", publish_status: "published" } },
            { policies: { id: "policy-3", publish_status: "published" } },
          ],
        },
      })
    ).toEqual({
      policyId: "policy-2",
      theme: { slug: "saga-no-mirai", name: "佐賀市のみらい", isOpen: true },
    });
  });

  it("施策に紐づかない抽象テーマ型はテーマだけを起点にする", () => {
    expect(
      getReportOrigin({
        started_at: "2026-05-06T00:00:00.000Z",
        completed_at: null,
        interview_config_id: "config-1",
        interview_configs: {
          slug: "saga-no-mirai",
          name: "佐賀市のみらい",
          status: "open",
          policies_interview_configs: [],
        },
      })
    ).toEqual({
      policyId: null,
      theme: { slug: "saga-no-mirai", name: "佐賀市のみらい", isOpen: true },
    });
  });

  it("紐づく施策がすべて未公開なら施策なしとして扱う", () => {
    expect(
      getReportOrigin({
        started_at: "2026-05-06T00:00:00.000Z",
        completed_at: null,
        interview_config_id: "config-1",
        interview_configs: {
          slug: "saga-no-mirai",
          name: "佐賀市のみらい",
          status: "open",
          policies_interview_configs: [
            { policies: { id: "policy-1", publish_status: "draft" } },
          ],
        },
      })?.policyId
    ).toBeNull();
  });

  it("意見募集を辿れないセッションは起点を決められない", () => {
    expect(
      getReportOrigin({
        started_at: "2026-05-06T00:00:00.000Z",
        completed_at: null,
        interview_config_id: "config-1",
        interview_configs: null,
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

const openThemeOrigin: ReportOrigin = {
  policyId: null,
  theme: { slug: "saga-no-mirai", name: "佐賀市のみらい", isOpen: true },
};

describe("getReportOriginLink", () => {
  it("施策があれば施策詳細を指す", () => {
    expect(
      getReportOriginLink({ ...openThemeOrigin, policyId: "policy-1" })
    ).toBe("/bills/policy-1");
  });

  it("施策がなく募集中ならテーマのページを指す", () => {
    expect(getReportOriginLink(openThemeOrigin)).toBe(
      "/interviews/saga-no-mirai"
    );
  });

  it("募集が終わったテーマは個別ページが公開されないのでテーマ一覧に送る", () => {
    expect(
      getReportOriginLink({
        ...openThemeOrigin,
        theme: { ...openThemeOrigin.theme, isOpen: false },
      })
    ).toBe("/interviews");
  });
});

describe("resolveReportSubject", () => {
  it("施策があれば難易度別コンテンツの見出しを名前に使う", () => {
    expect(
      resolveReportSubject(
        { name: "学校給食の無償化", bill_content: { title: "給食費をなくす" } },
        { ...openThemeOrigin, policyId: "policy-1" }
      )
    ).toEqual({ name: "給食費をなくす", href: "/bills/policy-1" });
  });

  it("見出しがなければ施策名にフォールバックする", () => {
    expect(
      resolveReportSubject(
        { name: "学校給食の無償化", bill_content: null },
        { ...openThemeOrigin, policyId: "policy-1" }
      ).name
    ).toBe("学校給食の無償化");
  });

  it("施策がなければテーマ名とテーマのページを使う", () => {
    expect(resolveReportSubject(null, openThemeOrigin)).toEqual({
      name: "佐賀市のみらい",
      href: "/interviews/saga-no-mirai",
    });
  });
});
