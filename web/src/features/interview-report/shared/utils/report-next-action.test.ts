import { describe, expect, it } from "vitest";
import type { ReportOrigin } from "./public-report-display";
import { resolveReportNextAction } from "./report-next-action";

const policyOrigin: ReportOrigin = {
  policyId: "policy-1",
  theme: { slug: "wakamono", name: "若者のみらい", isOpen: true },
};

const themeOnlyOrigin: ReportOrigin = {
  policyId: null,
  theme: { slug: "seiji-sanka", name: "政治参加", isOpen: true },
};

describe("resolveReportNextAction", () => {
  it("まとめが公開されていれば、まとめページへ案内する", () => {
    expect(
      resolveReportNextAction({
        origin: policyOrigin,
        policyName: "若者支援",
        hasPublishedSummary: true,
      })
    ).toEqual({
      href: "/interviews/wakamono/summary",
      label: "意見まとめを見る",
    });
  });

  it("施策に紐づかないテーマでも、まとめがあればまとめページへ案内する", () => {
    expect(
      resolveReportNextAction({
        origin: themeOnlyOrigin,
        hasPublishedSummary: true,
      }).href
    ).toBe("/interviews/seiji-sanka/summary");
  });

  it("まとめがなければ、施策のページに戻す", () => {
    expect(
      resolveReportNextAction({
        origin: policyOrigin,
        policyName: "若者支援",
        hasPublishedSummary: false,
      })
    ).toEqual({ href: "/bills/policy-1", label: "若者支援に戻る" });
  });

  it("施策名がわからなければ、汎用の文言で施策のページに戻す", () => {
    expect(
      resolveReportNextAction({
        origin: policyOrigin,
        hasPublishedSummary: false,
      })
    ).toEqual({ href: "/bills/policy-1", label: "施策の記事に戻る" });
  });

  it("まとめがなく施策にも紐づかなければ、サイトトップに戻す", () => {
    expect(
      resolveReportNextAction({
        origin: themeOnlyOrigin,
        hasPublishedSummary: false,
      })
    ).toEqual({ href: "/", label: "トップに戻る" });
  });
});
