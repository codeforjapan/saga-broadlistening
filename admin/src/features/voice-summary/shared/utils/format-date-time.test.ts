import { describe, expect, it } from "vitest";
import { formatDateTime } from "./format-date-time";

describe("formatDateTime", () => {
  it("日本時間で表示する", () => {
    expect(formatDateTime("2026-10-13T00:30:00Z")).toBe("2026/10/13 9:30");
  });

  it("値がなければ「—」", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});
