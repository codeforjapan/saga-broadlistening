import { describe, expect, it } from "vitest";
import { resolveThemeShareImageUrl } from "./interview-share-image";

describe("resolveThemeShareImageUrl", () => {
  it("テーマの画像があればそれを使う", () => {
    expect(
      resolveThemeShareImageUrl(
        "https://example.com/theme.png",
        "https://web.example.com"
      )
    ).toBe("https://example.com/theme.png");
  });

  it("画像が無ければ既定のOGP画像を絶対URLで返す", () => {
    expect(resolveThemeShareImageUrl(null, "https://web.example.com")).toBe(
      "https://web.example.com/ogp.jpg"
    );
  });

  it("空文字は画像なしとして扱う", () => {
    expect(resolveThemeShareImageUrl("", "https://web.example.com")).toBe(
      "https://web.example.com/ogp.jpg"
    );
  });
});
