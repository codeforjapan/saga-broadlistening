import { describe, expect, it } from "vitest";

import {
  policyInterviewTarget,
  themeInterviewTarget,
} from "../types/interview-target";
import {
  extractInterviewTargetFromPath,
  getBillDetailLink,
  getInterviewChatLink,
  getInterviewChatLogLink,
  getInterviewDisclosureLink,
  getInterviewExitLink,
  getInterviewLPLink,
  getInterviewMessageLink,
  getInterviewReportCompleteLink,
  getPublicReportLink,
  getThemeCardLink,
  getThemeHomeLink,
} from "./interview-links";

describe("getBillDetailLink", () => {
  it("returns bill detail path without preview token", () => {
    expect(getBillDetailLink("bill-123")).toBe("/bills/bill-123");
  });

  it("returns preview path with token when provided", () => {
    expect(getBillDetailLink("bill-123", "tok-abc")).toBe(
      "/preview/bills/bill-123?token=tok-abc"
    );
  });
});

describe("getInterviewLPLink", () => {
  it("returns interview LP path for a policy target", () => {
    expect(getInterviewLPLink(policyInterviewTarget("bill-123"))).toBe(
      "/bills/bill-123/interview"
    );
  });

  it("returns preview interview LP path when the policy target carries a token", () => {
    expect(
      getInterviewLPLink(policyInterviewTarget("bill-123", "tok-abc"))
    ).toBe("/preview/bills/bill-123/interview?token=tok-abc");
  });

  it("returns the standalone theme LP path for a theme target", () => {
    expect(getInterviewLPLink(themeInterviewTarget("saga-no-mirai"))).toBe(
      "/interviews/saga-no-mirai"
    );
  });
});

describe("getInterviewDisclosureLink", () => {
  it("returns disclosure path for a policy target", () => {
    expect(getInterviewDisclosureLink(policyInterviewTarget("bill-123"))).toBe(
      "/bills/bill-123/interview/disclosure"
    );
  });

  it("returns preview disclosure path when the policy target carries a token", () => {
    expect(
      getInterviewDisclosureLink(policyInterviewTarget("bill-123", "tok-abc"))
    ).toBe("/preview/bills/bill-123/interview/disclosure?token=tok-abc");
  });

  it("returns the standalone theme disclosure path for a theme target", () => {
    expect(
      getInterviewDisclosureLink(themeInterviewTarget("saga-no-mirai"))
    ).toBe("/interviews/saga-no-mirai/disclosure");
  });
});

describe("getInterviewChatLink", () => {
  it("returns interview chat path for a policy target", () => {
    expect(getInterviewChatLink(policyInterviewTarget("bill-123"))).toBe(
      "/bills/bill-123/interview/chat"
    );
  });

  it("returns preview interview chat path when the policy target carries a token", () => {
    expect(
      getInterviewChatLink(policyInterviewTarget("bill-123", "tok-abc"))
    ).toBe("/preview/bills/bill-123/interview/chat?token=tok-abc");
  });

  it("returns the standalone theme chat path for a theme target", () => {
    expect(getInterviewChatLink(themeInterviewTarget("saga-no-mirai"))).toBe(
      "/interviews/saga-no-mirai/chat"
    );
  });
});

describe("getInterviewExitLink", () => {
  it("returns the bill detail page for a policy target", () => {
    expect(getInterviewExitLink(policyInterviewTarget("bill-123"))).toBe(
      "/bills/bill-123"
    );
  });

  it("keeps the preview context for a policy target", () => {
    expect(
      getInterviewExitLink(policyInterviewTarget("bill-123", "tok-abc"))
    ).toBe("/preview/bills/bill-123?token=tok-abc");
  });

  it("returns the theme list for a theme target because it has no bill page", () => {
    expect(getInterviewExitLink(themeInterviewTarget("saga-no-mirai"))).toBe(
      "/interviews"
    );
  });
});

describe("getThemeHomeLink", () => {
  it("募集中のテーマはテーマのページを指す", () => {
    expect(getThemeHomeLink({ slug: "saga-no-mirai", isOpen: true })).toBe(
      "/interviews/saga-no-mirai"
    );
  });

  it("募集が終わったテーマは個別ページが無いためテーマ一覧を指す", () => {
    expect(getThemeHomeLink({ slug: "saga-no-mirai", isOpen: false })).toBe(
      "/interviews"
    );
  });
});

describe("getThemeCardLink", () => {
  it("募集中のテーマは参加導線（テーマのLP）へ送る", () => {
    expect(getThemeCardLink({ slug: "kosodate", isOpen: true })).toBe(
      "/interviews/kosodate"
    );
  });

  it("募集終了のテーマはLPが無いため結果（トピック一覧）へ送る", () => {
    expect(getThemeCardLink({ slug: "kosodate", isOpen: false })).toBe(
      "/interviews/kosodate/topics"
    );
  });
});

describe("getInterviewReportCompleteLink", () => {
  it("returns report complete path", () => {
    expect(getInterviewReportCompleteLink("report-456")).toBe(
      "/report/report-456/complete"
    );
  });
});

describe("getPublicReportLink", () => {
  it("returns public report path", () => {
    expect(getPublicReportLink("report-456")).toBe("/report/report-456");
  });

  it("returns public report path with from=opinions when from is specified", () => {
    expect(getPublicReportLink("report-456", "opinions")).toBe(
      "/report/report-456?from=opinions"
    );
  });
});

describe("getInterviewChatLogLink", () => {
  it("returns public report chat-log section because chat log is integrated there", () => {
    expect(getInterviewChatLogLink("report-456")).toBe(
      "/report/report-456#chat-log"
    );
  });

  it("returns public report chat-log section with from=opinions when from is specified", () => {
    expect(getInterviewChatLogLink("report-456", "opinions")).toBe(
      "/report/report-456?from=opinions#chat-log"
    );
  });

  it("returns report complete chat-log section when from=complete is specified", () => {
    expect(getInterviewChatLogLink("report-456", "complete")).toBe(
      "/report/report-456/complete#chat-log"
    );
  });
});

describe("getInterviewMessageLink", () => {
  it("returns public report message anchor", () => {
    expect(getInterviewMessageLink("report-456", "abc-123")).toBe(
      "/report/report-456#message-abc-123"
    );
  });

  it("returns public report message anchor with from=opinions when from is specified", () => {
    expect(getInterviewMessageLink("report-456", "abc-123", "opinions")).toBe(
      "/report/report-456?from=opinions#message-abc-123"
    );
  });

  it("returns report complete message anchor when from=complete is specified", () => {
    expect(getInterviewMessageLink("report-456", "abc-123", "complete")).toBe(
      "/report/report-456/complete#message-abc-123"
    );
  });

  it("appends encoded quote and mid as query before the hash", () => {
    expect(
      getInterviewMessageLink(
        "report-456",
        "abc-123",
        undefined,
        "戻ったら違う部署"
      )
    ).toBe(
      `/report/report-456?quote=${encodeURIComponent("戻ったら違う部署")}&mid=abc-123#message-abc-123`
    );
  });

  it("uses & separator when from query already present", () => {
    expect(
      getInterviewMessageLink("report-456", "abc-123", "opinions", "引用")
    ).toBe(
      `/report/report-456?from=opinions&quote=${encodeURIComponent("引用")}&mid=abc-123#message-abc-123`
    );
  });
});

describe("extractInterviewTargetFromPath", () => {
  it("returns a policy target for a bill path", () => {
    expect(extractInterviewTargetFromPath("/bills/abc-123")).toEqual({
      kind: "policy",
      policyId: "abc-123",
      previewToken: undefined,
    });
  });

  it("returns a policy target for a bill-scoped interview chat path", () => {
    expect(
      extractInterviewTargetFromPath("/bills/abc-123/interview/chat")
    ).toEqual({
      kind: "policy",
      policyId: "abc-123",
      previewToken: undefined,
    });
  });

  it("carries the preview token into the policy target", () => {
    expect(
      extractInterviewTargetFromPath(
        "/preview/bills/abc-123/interview/chat",
        "tok-abc"
      )
    ).toEqual({
      kind: "policy",
      policyId: "abc-123",
      previewToken: "tok-abc",
    });
  });

  it("returns a theme target for a standalone theme path", () => {
    expect(
      extractInterviewTargetFromPath("/interviews/saga-no-mirai/chat")
    ).toEqual({ kind: "theme", slug: "saga-no-mirai" });
  });

  it("returns null for the theme list page because it has no target", () => {
    expect(extractInterviewTargetFromPath("/interviews")).toBeNull();
  });

  it("returns null for an unrelated path", () => {
    expect(extractInterviewTargetFromPath("/about")).toBeNull();
  });

  it("returns null for the top page", () => {
    expect(extractInterviewTargetFromPath("/")).toBeNull();
  });
});
