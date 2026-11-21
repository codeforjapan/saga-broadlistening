import { describe, expect, it } from "vitest";
import { THEME_NAMES, THEMES } from "./themes";

describe("テーマ", () => {
  it("みてみての見出しは Zen Maru Gothic（D-15）", () => {
    expect(THEMES.mitemite.headingFont).toContain("--font-zen-maru-gothic");
  });

  it("きかせての見出しは Noto Sans JP（#271）", () => {
    expect(THEMES.kikasete.headingFont).not.toContain("--font-zen-maru-gothic");
    expect(THEMES.kikasete.headingFont).toContain("--font-noto-sans-jp");
  });

  it.each(THEME_NAMES)(
    "%s の見出しは読めない環境でも本文書体にフォールバックする",
    (theme) => {
      expect(THEMES[theme].headingFont).toContain("--font-noto-sans-jp");
    }
  );
});
