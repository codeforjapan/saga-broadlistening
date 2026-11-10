import { BRAND_CONFIG } from "@mirai-gikai/branding/config";
import { describe, expect, it } from "vitest";
import { resolveThemeShareImageUrl } from "./interview-share-image";

const DEFAULT_OGP_URL = new URL(
  BRAND_CONFIG.assets.ogpImage.src,
  "https://web.example.com"
).toString();

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
      DEFAULT_OGP_URL
    );
  });

  it("空文字は画像なしとして扱う", () => {
    expect(resolveThemeShareImageUrl("", "https://web.example.com")).toBe(
      DEFAULT_OGP_URL
    );
  });
});
