import { describe, expect, it } from "vitest";
import { PRIMITIVES } from "./palette";
import { rgba, SHADOWS } from "./shadows";

describe("rgba", () => {
  it("hexをrgba文字列に変換する", () => {
    expect(rgba("#2b2b2b", 0.06)).toBe("rgba(43, 43, 43, 0.06)");
  });

  it("パレットの値から変換するので二重管理にならない", () => {
    expect(rgba(PRIMITIVES["sky-700"], 0.35)).toBe("rgba(0, 119, 200, 0.35)");
  });
});

describe("シャドウトークン（要求仕様3.4）", () => {
  it("要求仕様の3種と、TOP のテーマカード用の floating が定義されている", () => {
    expect(Object.keys(SHADOWS)).toEqual([
      "card",
      "raised",
      "floating",
      "focus",
    ]);
  });

  it("card は仕様の2段重ね", () => {
    expect(SHADOWS.card).toBe(
      "0 1px 2px rgba(43, 43, 43, 0.06), 0 1px 1px rgba(43, 43, 43, 0.04)"
    );
  });

  it("raised は card より強い浮き上がり", () => {
    expect(SHADOWS.raised).toBe("0 2px 6px rgba(43, 43, 43, 0.08)");
  });

  it("floating は広がり 3px で四辺に影を出す", () => {
    expect(SHADOWS.floating).toBe(
      "0 10px 15px 3px rgba(43, 43, 43, 0.1), 0 4px 6px -4px rgba(43, 43, 43, 0.1)"
    );
  });

  it("focus は sky/700 由来のリング", () => {
    expect(SHADOWS.focus).toBe("0 0 0 3px rgba(0, 119, 200, 0.35)");
  });

  it("card / raised / floating は base-ink 系（有彩色のシャドウを使わない）", () => {
    const ink = rgba(PRIMITIVES["base-ink"], 1).replace(", 1)", "");
    for (const token of ["card", "raised", "floating"] as const) {
      // rgba(43, 43, 43, ...) の形であること
      expect(SHADOWS[token], token).toContain(ink);
    }
  });

  it("フォーカス以外に有彩色が混ざっていない", () => {
    const chromatic = [
      PRIMITIVES["sky-400"],
      PRIMITIVES["green-400"],
      PRIMITIVES["yellow-400"],
      PRIMITIVES["lavender-500"],
    ].map((hex) => rgba(hex, 1).replace(", 1)", ""));

    for (const token of ["card", "raised", "floating"] as const) {
      for (const color of chromatic) {
        expect(SHADOWS[token], `${token} / ${color}`).not.toContain(color);
      }
    }
  });
});
