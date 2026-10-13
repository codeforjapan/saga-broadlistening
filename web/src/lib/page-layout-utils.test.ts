import { describe, expect, it } from "vitest";

import {
  getPageLayout,
  isInterviewPage,
  isInterviewSection,
} from "./page-layout-utils";

describe("getPageLayout", () => {
  it("TOPは全幅で、スマホでは難易度切り替えをメニューへ移す", () => {
    expect(getPageLayout("/")).toEqual({
      showDifficultySelector: true,
      difficultyInMobileMenu: true,
      chatSidebar: false,
      fullBleed: true,
    });
  });

  it("施策詳細ページは右に常設チャットを置く", () => {
    expect(getPageLayout("/bills/abc-123")).toEqual({
      showDifficultySelector: true,
      difficultyInMobileMenu: false,
      chatSidebar: true,
      fullBleed: false,
    });
  });

  it.each([
    "/bills/abc-123/interview",
    "/about",
    "/bills",
    "/bills/",
    "/interviews/wakamono-shien",
  ])("%s は既定のレイアウト", (pathname) => {
    expect(getPageLayout(pathname)).toEqual({
      showDifficultySelector: false,
      difficultyInMobileMenu: false,
      chatSidebar: false,
      fullBleed: false,
    });
  });
});

describe("isInterviewPage", () => {
  it("returns true for the bill-scoped interview chat page", () => {
    expect(isInterviewPage("/bills/abc-123/interview/chat")).toBe(true);
  });

  it("returns true for the standalone theme chat page", () => {
    expect(isInterviewPage("/interviews/saga-no-mirai/chat")).toBe(true);
  });

  it("returns false for the interview LP page", () => {
    expect(isInterviewPage("/bills/abc-123/interview")).toBe(false);
  });

  it("returns false for the standalone theme LP page", () => {
    expect(isInterviewPage("/interviews/saga-no-mirai")).toBe(false);
  });

  it("returns false for the bill detail page", () => {
    expect(isInterviewPage("/bills/abc-123")).toBe(false);
  });

  it("returns false for the top page", () => {
    expect(isInterviewPage("/")).toBe(false);
  });
});

describe("isInterviewSection", () => {
  it("returns true for the bill-scoped interview LP page", () => {
    expect(isInterviewSection("/bills/abc-123/interview")).toBe(true);
  });

  it("returns true for the bill-scoped interview chat page", () => {
    expect(isInterviewSection("/bills/abc-123/interview/chat")).toBe(true);
  });

  it("returns true for the standalone theme LP page", () => {
    expect(isInterviewSection("/interviews/saga-no-mirai")).toBe(true);
  });

  it("returns true for the standalone theme chat page", () => {
    expect(isInterviewSection("/interviews/saga-no-mirai/chat")).toBe(true);
  });

  it("returns false for the theme list page itself", () => {
    expect(isInterviewSection("/interviews")).toBe(false);
  });

  it("returns false for the bill detail page", () => {
    expect(isInterviewSection("/bills/abc-123")).toBe(false);
  });

  it("returns false for the top page", () => {
    expect(isInterviewSection("/")).toBe(false);
  });

  it("returns false for an unrelated page", () => {
    expect(isInterviewSection("/about")).toBe(false);
  });
});
