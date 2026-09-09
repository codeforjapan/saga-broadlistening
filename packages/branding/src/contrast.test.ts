import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hexToRgb,
  meetsAaLargeTextOrUi,
  meetsAaText,
  relativeLuminance,
} from "./contrast";

describe("hexToRgb", () => {
  it("6桁hexをRGBに変換する", () => {
    expect(hexToRgb("#55c1ff")).toEqual({ r: 0x55, g: 0xc1, b: 0xff });
  });

  it("3桁hexを展開して変換する", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("先頭の # を省略できる", () => {
    expect(hexToRgb("2b2b2b")).toEqual({ r: 0x2b, g: 0x2b, b: 0x2b });
  });

  it("大文字小文字を区別しない", () => {
    expect(hexToRgb("#AEDFFF")).toEqual(hexToRgb("#aedfff"));
  });

  it("不正な値では例外を投げる", () => {
    expect(() => hexToRgb("#12345")).toThrow();
    expect(() => hexToRgb("rgb(0,0,0)")).toThrow();
    expect(() => hexToRgb("")).toThrow();
  });
});

describe("relativeLuminance", () => {
  it("白は1、黒は0", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });
});

describe("contrastRatio", () => {
  it("白と黒は21:1", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 2);
  });

  it("同じ色同士は1:1", () => {
    expect(contrastRatio("#55c1ff", "#55c1ff")).toBeCloseTo(1, 5);
  });

  it("引数の順序を入れ替えても同じ比になる", () => {
    expect(contrastRatio("#0077c8", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#0077c8"),
      10
    );
  });
});

describe("AA判定", () => {
  it("通常テキストは4.5:1が境界", () => {
    // sky/700 は対白 4.7:1
    expect(meetsAaText("#0077c8", "#ffffff")).toBe(true);
    // lavender/500 は対白 4.0:1
    expect(meetsAaText("#7b6cf6", "#ffffff")).toBe(false);
  });

  it("大テキスト・UI部品は3:1が境界", () => {
    expect(meetsAaLargeTextOrUi("#7b6cf6", "#ffffff")).toBe(true);
    // yellow/400 は対白 2.3:1
    expect(meetsAaLargeTextOrUi("#ffd644", "#ffffff")).toBe(false);
  });
});
