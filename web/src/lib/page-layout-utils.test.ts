import { describe, expect, it } from "vitest";

import {
  isInterviewPage,
  isInterviewSection,
  isMainPage,
} from "./page-layout-utils";

describe("isMainPage", () => {
  it("returns true for the top page", () => {
    expect(isMainPage("/")).toBe(true);
  });

  it("returns true for a bill detail page", () => {
    expect(isMainPage("/bills/abc-123")).toBe(true);
  });

  it("returns false for a bill sub-page", () => {
    expect(isMainPage("/bills/abc-123/interview")).toBe(false);
  });

  it("returns false for an unrelated path", () => {
    expect(isMainPage("/about")).toBe(false);
  });

  it("returns false for the bills list page", () => {
    expect(isMainPage("/bills")).toBe(false);
    expect(isMainPage("/bills/")).toBe(false);
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
