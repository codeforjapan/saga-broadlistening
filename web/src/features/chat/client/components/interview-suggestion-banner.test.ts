import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { policyInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { InterviewSuggestionBanner } from "./interview-suggestion-banner";

describe("InterviewSuggestionBanner", () => {
  it("参加不可なら施策名ではなく設定されたテーマの選び直しを案内する", () => {
    const html = renderToStaticMarkup(
      createElement(InterviewSuggestionBanner, {
        billId: "policy",
        billName: "奨学金返還支援",
        participation: {
          kind: "guide",
          themeName: "若者支援",
          providers: [
            {
              key: "saga_super_app",
              displayName: "佐賀市スーパーアプリ",
              guideUrl: null,
            },
          ],
        },
      })
    );
    expect(html).toContain("「若者支援」を選んでください");
    expect(html).not.toContain("AIインタビューを受ける");
  });

  it("参加できる職員プレビューはLPリンクにトークンを保持する", () => {
    const html = renderToStaticMarkup(
      createElement(InterviewSuggestionBanner, {
        billId: "policy",
        billName: "奨学金返還支援",
        participation: { kind: "allowed" },
        target: policyInterviewTarget("policy", "staff-token"),
      })
    );
    expect(html).toContain("/preview/bills/policy/interview?token=staff-token");
    expect(html).toContain("AIインタビューを受ける");
  });
});
