import { describe, expect, it } from "vitest";
import { generateDefaultConfigSlug } from "./default-config-slug";

describe("generateDefaultConfigSlug", () => {
  it("interview-YYYYMMDD-接尾辞 の形式で返す", () => {
    const date = new Date("2026-02-19T10:00:00+09:00");
    expect(generateDefaultConfigSlug(date, "a1b2c3")).toBe(
      "interview-20260219-a1b2c3"
    );
  });

  it("UTCの日付がJSTで翌日になるケースを正しく扱う", () => {
    // UTC 23:00 = JST 翌日 08:00
    const date = new Date("2026-03-31T23:00:00Z");
    expect(generateDefaultConfigSlug(date, "abc123")).toBe(
      "interview-20260401-abc123"
    );
  });

  it("引数なしでも URL に使える文字だけで生成し、呼ぶたびに変わる", () => {
    const first = generateDefaultConfigSlug();
    const second = generateDefaultConfigSlug();
    expect(first).toMatch(/^interview-\d{8}-[a-z0-9]{6}$/);
    expect(first).not.toBe(second);
  });
});
