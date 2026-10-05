import { describe, expect, it } from "vitest";
import { usesThemeGrid } from "./top-themes";

describe("usesThemeGrid", () => {
  it("3件までは縦積み", () => {
    expect(usesThemeGrid(2)).toBe(false);
    expect(usesThemeGrid(3)).toBe(false);
  });

  it("4件以上で2カラムのグリッドに切り替える", () => {
    expect(usesThemeGrid(4)).toBe(true);
    expect(usesThemeGrid(5)).toBe(true);
  });
});
