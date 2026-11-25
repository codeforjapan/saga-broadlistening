import { describe, expect, it } from "vitest";
import { normalizeLegacyReport } from "./normalize-legacy-report";

describe("normalizeLegacyReport", () => {
  it("AI が書いていた final_text は落とし、見出しはそのまま残す", () => {
    expect(
      normalizeLegacyReport({ summary: "見出し", final_text: "本文" })
    ).toEqual({ summary: "見出し" });
  });

  it("見出しが無ければ、final_text を見出しにする", () => {
    expect(
      normalizeLegacyReport({ summary: null, final_text: "本文" })
    ).toEqual({ summary: "本文" });
  });

  it("見出しが空文字のときも、final_text を見出しにする", () => {
    expect(normalizeLegacyReport({ summary: "", final_text: "本文" })).toEqual({
      summary: "本文",
    });
  });

  it("見出しも final_text も無ければ、見出しは空のまま（抽出の検証で弾かれる）", () => {
    expect(normalizeLegacyReport({ summary: null })).toEqual({ summary: null });
  });

  it("opinions に無い新しい項目を null で補い、ある項目は残す", () => {
    expect(
      normalizeLegacyReport({
        summary: "見出し",
        opinions: [{ title: "t", content: "c", richness: 50 }],
      })
    ).toEqual({
      summary: "見出し",
      opinions: [
        {
          title: "t",
          content: "c",
          contextual_quote: null,
          richness: 50,
          concern: null,
          proposal: null,
          reasoning_types: null,
        },
      ],
    });
  });

  it("オブジェクトでなければ、そのまま返す", () => {
    expect(normalizeLegacyReport(null)).toBeNull();
    expect(normalizeLegacyReport("x")).toBe("x");
  });
});
