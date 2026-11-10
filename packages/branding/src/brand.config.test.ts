import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BRAND_CONFIG } from "./brand.config";

// fork 先が設定を書き換えたとき、置き忘れた画像やパスの書き間違いに気づけるようにする
const WEB_PUBLIC_DIR = fileURLToPath(
  new URL("../../../web/public", import.meta.url)
);

const { chatAvatarSrc, logo, logoCompact, ogpLogoSrc, ogpImage } =
  BRAND_CONFIG.assets;
const assetPaths = [
  chatAvatarSrc,
  logo.src,
  logoCompact.src,
  ogpLogoSrc,
  ogpImage.src,
].filter((src): src is string => src !== null);

describe("BRAND_CONFIG", () => {
  it.each(assetPaths)("%s は web/public 配下のローカルパスで、ファイルがある", (src) => {
    expect(src.startsWith("/") && !src.startsWith("//")).toBe(true);
    expect(existsSync(`${WEB_PUBLIC_DIR}${src}`)).toBe(true);
  });

  it.each(Object.entries(BRAND_CONFIG.links))("links.%s は https の URL", (_, url) => {
    expect(new URL(url).protocol).toBe("https:");
  });
});
