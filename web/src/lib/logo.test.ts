import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type LogoVariant, logoImageProps } from "./logo";

/** テストファイルからの相対で public/ の実アセットを読む（cwdに依存させない） */
function asset(name: string): Buffer {
  return readFileSync(new URL(`../../public/${name}`, import.meta.url));
}

/** SVGのviewBoxから実寸を読む */
function svgViewBox(path: string): { width: number; height: number } {
  const svg = asset(path).toString("utf-8");
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!m) throw new Error(`viewBox not found in ${path}`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

describe("logoImageProps", () => {
  it("実際に使っている高さで期待どおりの寸法を返す", () => {
    // ヘッダー(compact) / フッター(full) / desktop-menu・OGP(full)
    expect(logoImageProps("compact", 32)).toEqual({
      src: "/img/logo-compact.svg",
      width: 83,
      height: 32,
    });
    expect(logoImageProps("full", 76)).toEqual({
      src: "/img/logo.svg",
      width: 149,
      height: 76,
    });
    expect(logoImageProps("full", 88)).toEqual({
      src: "/img/logo.svg",
      width: 172,
      height: 88,
    });
  });

  it("compactはfullより横長（タグラインを外した分だけ高さが減る）", () => {
    const full = logoImageProps("full", 100);
    const compact = logoImageProps("compact", 100);
    expect(compact.width).toBeGreaterThan(full.width);
  });

  // 以下は「ヘルパーの比率」と「public/ の実アセット」がドリフトしていないことの検証。
  // ロゴを別比率のものに差し替えたらここで落ちるのが狙い。
  it.each<LogoVariant>([
    "full",
    "compact",
  ])("%s のviewBoxと同じ縦横比を返す", (variant) => {
    const { src } = logoImageProps(variant, 1);
    const { width, height } = svgViewBox(src.replace(/^\/img\//, "img/"));

    expect(logoImageProps(variant, height)).toEqual({
      src,
      width: Math.round(width),
      height,
    });
  });

  it("OGP用ラスター版 ogp-logo.png はfullの表示枠の2倍で書き出されている", () => {
    // PNGのIHDRチャンク: 16..20 が width、20..24 が height (big-endian uint32)
    const png = asset("img/ogp-logo.png");
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];

    const displayed = logoImageProps("full", height / 2);
    expect({
      width: displayed.width * 2,
      height: displayed.height * 2,
    }).toEqual({ width, height });
  });
});
