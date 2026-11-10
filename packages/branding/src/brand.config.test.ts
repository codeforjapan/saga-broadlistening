import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandImage } from "./brand-config-types";
import { BRAND_CONFIG } from "./brand.config";

// fork 先が設定を書き換えたとき、画像の置き忘れ・パスの書き間違い・
// 実寸と設定値のずれ（レイアウトシフトや縦横比の歪みの原因）に気づけるようにする
const WEB_PUBLIC_DIR = fileURLToPath(
  new URL("../../../web/public", import.meta.url)
);

function readAsset(src: string): Buffer {
  return readFileSync(`${WEB_PUBLIC_DIR}${src}`);
}

/** SVG の viewBox から実寸を読む */
function svgSize(src: string) {
  const m = readAsset(src)
    .toString("utf-8")
    .match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!m) throw new Error(`viewBox not found in ${src}`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

/** PNG の IHDR チャンクから実寸を読む（16..20 が幅、20..24 が高さ） */
function pngSize(src: string) {
  const png = readAsset(src);
  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** JPEG の SOF マーカーから実寸を読む */
function jpegSize(src: string) {
  const jpg = readAsset(src);
  let offset = 2;
  while (offset < jpg.length) {
    const marker = jpg.readUInt16BE(offset);
    const length = jpg.readUInt16BE(offset + 2);
    // SOF0〜SOF15（DHT・JPG・DAC の C4・C8・CC を除く）
    if (
      marker >= 0xffc0 &&
      marker <= 0xffcf &&
      ![0xffc4, 0xffc8, 0xffcc].includes(marker)
    ) {
      return {
        height: jpg.readUInt16BE(offset + 5),
        width: jpg.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error(`SOF not found in ${src}`);
}

const { chatAvatarSrc, logo, logoCompact, ogpLogoSrc, ogpImage } =
  BRAND_CONFIG.assets;
// chatAvatarSrc は null（デフォルトのアイコン）を取りうるので、型を広げてから除く
const configuredPaths: (string | null)[] = [
  chatAvatarSrc,
  logo.src,
  logoCompact.src,
  ogpLogoSrc,
  ogpImage.src,
];
const assetPaths = configuredPaths.filter(
  (src): src is string => src !== null
);

describe("BRAND_CONFIG.assets", () => {
  it.each(assetPaths)("%s は web/public 配下のローカルパスで、ファイルがある", (src) => {
    // 外部URLは next/image の remotePatterns を通らず外部ホストへ接続しうるので許可しない
    expect(src.startsWith("/") && !src.startsWith("//")).toBe(true);
    expect(existsSync(`${WEB_PUBLIC_DIR}${src}`)).toBe(true);
  });

  it.each<[string, BrandImage]>([
    ["logo", logo],
    ["logoCompact", logoCompact],
  ])("%s の width・height が SVG の viewBox と一致する", (_, image) => {
    expect(svgSize(image.src)).toEqual({
      width: image.width,
      height: image.height,
    });
  });

  it("ogpLogoSrc（PNG）は logo と同じ縦横比", () => {
    const { width, height } = pngSize(ogpLogoSrc);
    expect(Math.round((height * logo.width) / logo.height)).toBe(width);
  });

  it("ogpImage の width・height が JPEG の実寸と一致する", () => {
    expect(jpegSize(ogpImage.src)).toEqual({
      width: ogpImage.width,
      height: ogpImage.height,
    });
  });
});

describe("BRAND_CONFIG の文言・リンク", () => {
  it.each(Object.entries(BRAND_CONFIG.links))("links.%s は https の URL", (_, url) => {
    expect(new URL(url).protocol).toBe("https:");
  });

  it("旧ブランド名が残っていない", () => {
    expect(BRAND_CONFIG.siteName).not.toContain("みらい議会");
  });

  it("説明文に国政由来の語彙が残っていない", () => {
    expect(BRAND_CONFIG.siteDescription).not.toMatch(
      /法案|議案|国会|衆議院|参議院/
    );
  });
});
