import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { logoSizeForHeight } from "./logo";

/** テストファイルからの相対で public/ の実アセットを読む（cwdに依存させない） */
function asset(name: string): Buffer {
  return readFileSync(new URL(`../../public/${name}`, import.meta.url));
}

describe("logoSizeForHeight", () => {
  it("実際に使っている高さで期待どおりの寸法を返す", () => {
    expect(logoSizeForHeight(36)).toEqual({ width: 70, height: 36 });
    expect(logoSizeForHeight(76)).toEqual({ width: 149, height: 76 });
    expect(logoSizeForHeight(88)).toEqual({ width: 172, height: 88 });
  });

  it("任意の高さで丸め誤差が0.5px以内に収まる", () => {
    // 呼び出し側の高さが変わっても比率が崩れないことを、列挙に依存せず保証する
    for (let height = 1; height <= 600; height++) {
      const { width } = logoSizeForHeight(height);
      expect(Math.abs(width - (height * 546) / 279)).toBeLessThanOrEqual(0.5);
    }
  });

  // ここから下は「ヘルパーの比率」と「public/ の実アセット」がドリフトしていない
  // ことを検証する。ロゴを別比率のものに差し替えたらここで落ちるのが狙い。
  it("logo.svg のviewBoxと同じ縦横比を返す", () => {
    const svg = asset("img/logo.svg").toString("utf-8");
    const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(viewBox).not.toBeNull();
    const [width, height] = [Number(viewBox?.[1]), Number(viewBox?.[2])];

    expect(logoSizeForHeight(height)).toEqual({ width, height });
  });

  it("OGP用ラスター版 ogp-logo.png も同じ縦横比で書き出されている", () => {
    // PNGのIHDRチャンク: 16..20 が width、20..24 が height (big-endian uint32)
    const png = asset("img/ogp-logo.png");
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];

    expect(logoSizeForHeight(height)).toEqual({ width, height });
  });
});
