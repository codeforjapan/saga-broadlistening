import { describe, expect, it } from "vitest";
import { formatVoicesMeta } from "./voices-meta";

describe("formatVoicesMeta", () => {
  it("件数と更新日を並べる", () => {
    expect(
      formatVoicesMeta({
        opinionCount: 1240,
        updatedAt: "2026-10-08T03:00:00Z",
      })
    ).toBe("1,240件のご意見 · 2026.10.8 更新");
  });

  it("更新日がなければ件数だけ", () => {
    expect(formatVoicesMeta({ opinionCount: 86, updatedAt: null })).toBe(
      "86件のご意見"
    );
  });
});
