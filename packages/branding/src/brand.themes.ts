import type { BrandThemes, Theme } from "./theme-types";

/**
 * 自治体ごとのテーマの値（佐賀市）。fork 先はこのファイルを書き換える。
 *
 * - `default`：施策紹介などサイト全体の土台（佐賀市では「CHIKAT みてみて」の水色）。すべての値を書く
 * - `interview`：AIインタビューの画面（佐賀市では「CHIKAT きかせて」の緑）。
 *   `default` と変える値だけを書き、書かなかった値は `default` の値になる
 *
 * 仕組みは theme-types.ts を参照。
 */

const ZEN_MARU_GOTHIC =
  "var(--font-zen-maru-gothic), var(--font-noto-sans-jp), system-ui, sans-serif";
const NOTO_SANS_JP = "var(--font-noto-sans-jp), system-ui, sans-serif";

/**
 * `primary-foreground` が `base-ink` である点が最重要。`sky-400` は対白 2.0:1 しかなく、
 * 白文字を載せると WCAG AA を満たさないため、有彩色の面に載せる文字は黒で統一する（D-13）。
 */
const DEFAULT_THEME: Theme = {
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
  headingFont: ZEN_MARU_GOTHIC,
  pageBackground: "var(--color-base-surface)",
};

export const BRAND_THEMES = {
  default: DEFAULT_THEME,
  /**
   * きかせての緑（Epic #162 / #279）。
   * #00B98D（kikasete-400）は対白 2.5:1 のため、飾り（decor）など面専用にする。
   * 白文字を載せるボタン面は kikasete-600、文字・リンクは kikasete-700 を使う。
   */
  interview: {
    colors: {
      primary: "kikasete-600",
      "primary-foreground": "base-white",
      "primary-accent": "kikasete-700",
      secondary: "kikasete-50",
      border: "kikasete-line",
      ring: "kikasete-700",
      decor: "kikasete-400",
    },
    headingFont: NOTO_SANS_JP,
    pageBackground:
      "linear-gradient(180deg, var(--color-kikasete-100) 0, var(--color-kikasete-50) 360px, var(--color-base-white) 1200px)",
  },
} as const satisfies BrandThemes;
