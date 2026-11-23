import { describe, expect, it } from "vitest";
import { THEME_NAMES, type Theme } from "./theme-types";
import { mergeTheme, resolveTheme } from "./themes";

const BASE: Theme = {
  colors: {
    background: "base-white",
    foreground: "base-ink",
    card: "base-white",
    "card-foreground": "base-ink",
    popover: "base-white",
    "popover-foreground": "base-ink",
    primary: "sky-400",
    "primary-foreground": "base-ink",
    "primary-accent": "sky-800",
    secondary: "sky-50",
    "secondary-foreground": "base-ink",
    muted: "base-surface",
    "muted-foreground": "base-ink-muted",
    accent: "lavender-300",
    "accent-foreground": "base-ink",
    destructive: "system-destructive",
    "destructive-foreground": "base-white",
    success: "system-success",
    warning: "system-warning",
    border: "base-surface",
    input: "base-ink-muted",
    ring: "sky-700",
    decor: "sky-400",
  },
  headingFont: "base-font",
  pageBackground: "base-background",
};

describe("mergeTheme", () => {
  it("書いた値は base の値より優先され、書かなかった値は base の値になる", () => {
    const merged = mergeTheme(BASE, {
      colors: { primary: "kikasete-600" },
      headingFont: "override-font",
    });

    expect(merged.colors.primary).toBe("kikasete-600");
    expect(merged.colors.background).toBe("base-white");
    expect(merged.headingFont).toBe("override-font");
    expect(merged.pageBackground).toBe("base-background");
  });

  it("colors を書かなくても base の色をすべて引き継ぐ", () => {
    expect(mergeTheme(BASE, { pageBackground: "x" }).colors).toEqual(
      BASE.colors
    );
  });

  it("base を書き換えない", () => {
    mergeTheme(BASE, { colors: { primary: "kikasete-600" } });
    expect(BASE.colors.primary).toBe("sky-400");
  });
});

describe("resolveTheme", () => {
  it("default はそのまま、ほかのテーマは default で補った値を返す", () => {
    const themes = { default: BASE, interview: { headingFont: "f" } };

    expect(resolveTheme("default", themes)).toBe(BASE);
    expect(resolveTheme("interview", themes)).toEqual({
      ...BASE,
      headingFont: "f",
    });
  });
});

describe("brand.themes.ts の値", () => {
  it("default の見出しは Zen Maru Gothic（D-15）", () => {
    expect(resolveTheme("default").headingFont).toContain(
      "--font-zen-maru-gothic"
    );
  });

  it("interview の見出しは Noto Sans JP（#271）", () => {
    const { headingFont } = resolveTheme("interview");
    expect(headingFont).not.toContain("--font-zen-maru-gothic");
    expect(headingFont).toContain("--font-noto-sans-jp");
  });

  it.each(THEME_NAMES)(
    "%s の見出しは読めない環境でも本文書体にフォールバックする",
    (theme) => {
      expect(resolveTheme(theme).headingFont).toContain("--font-noto-sans-jp");
    }
  );
});
