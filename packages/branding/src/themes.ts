/**
 * サービスごとのテーマ（「CHIKAT みてみて」＝施策紹介、「CHIKAT きかせて」＝AIインタビュー）。
 *
 * 2つのテーマは同じキーをすべて持つ。違いを見比べやすくするため、
 * 両者で変えない値も省略せずに同じ値を書く。
 *
 * `tokens.css` では、みてみてを `:root, .theme-mitemite`、きかせてを `.theme-kikasete`
 * の変数として出力する。ラッパーにクラスを付けると、配下の `bg-primary`・`font-heading`
 * などがそのテーマの値になる。クラスのないページ（admin を含む）はみてみての値になる。
 */

import type { PrimitiveToken } from "./palette";

export const THEME_NAMES = ["mitemite", "kikasete"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

/**
 * 色のトークン。shadcn/ui のセマンティック変数（`--primary` など）に、
 * テーマごとに変える部品の色を足したもの。値はプリミティブ（palette.ts）のキー。
 */
export type ThemeColorToken =
  | "background"
  | "foreground"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
  | "primary"
  | "primary-foreground"
  | "primary-accent"
  | "secondary"
  | "secondary-foreground"
  | "muted"
  | "muted-foreground"
  | "accent"
  | "accent-foreground"
  | "destructive"
  | "destructive-foreground"
  | "success"
  | "warning"
  | "border"
  | "input"
  | "ring"
  /** 進捗バーの塗り。文字を載せないので面専用の色を使える */
  | "progress"
  /** 進捗バーの溝 */
  | "progress-track"
  /** 見出しの頭に置く線アイコン（HeadingIcon）。飾りなので面専用の色を使える */
  | "heading-icon";

export interface Theme {
  colors: Record<ThemeColorToken, PrimitiveToken>;
  /** 見出し（h1〜h4・`font-heading`）の書体。値は各アプリの next/font の変数への参照 */
  headingFont: string;
  /** ページの地（`bg-page`）。CSS の background に入る値 */
  pageBackground: string;
}

const ZEN_MARU_GOTHIC =
  "var(--font-zen-maru-gothic), var(--font-noto-sans-jp), system-ui, sans-serif";
const NOTO_SANS_JP = "var(--font-noto-sans-jp), system-ui, sans-serif";

/**
 * `primary-foreground` が `base-ink` である点が最重要。`sky-400` は対白 2.0:1 しかなく、
 * 白文字を載せると WCAG AA を満たさないため、有彩色の面に載せる文字は黒で統一する（D-13）。
 */
const MITEMITE: Theme = {
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
    progress: "sky-400",
    "progress-track": "base-surface",
    "heading-icon": "sky-400",
  },
  headingFont: ZEN_MARU_GOTHIC,
  pageBackground: "var(--color-base-surface)",
};

/**
 * きかせての緑（Epic #162 / #279）。
 * #00B98D（kikasete-400）は対白 2.5:1 のため、進捗バーなど面専用にする。
 * 白文字を載せるボタン面は kikasete-600、文字・リンクは kikasete-700 を使う。
 */
const KIKASETE: Theme = {
  colors: {
    background: "base-white",
    foreground: "base-ink",
    card: "base-white",
    "card-foreground": "base-ink",
    popover: "base-white",
    "popover-foreground": "base-ink",
    primary: "kikasete-600",
    "primary-foreground": "base-white",
    "primary-accent": "kikasete-700",
    secondary: "kikasete-50",
    "secondary-foreground": "base-ink",
    muted: "base-surface",
    "muted-foreground": "base-ink-muted",
    accent: "lavender-300",
    "accent-foreground": "base-ink",
    destructive: "system-destructive",
    "destructive-foreground": "base-white",
    success: "system-success",
    warning: "system-warning",
    border: "kikasete-line",
    input: "base-ink-muted",
    ring: "kikasete-700",
    progress: "kikasete-400",
    "progress-track": "kikasete-line",
    "heading-icon": "kikasete-400",
  },
  headingFont: NOTO_SANS_JP,
  pageBackground:
    "linear-gradient(180deg, var(--color-kikasete-100) 0, var(--color-kikasete-50) 360px, var(--color-base-white) 1200px)",
};

export const THEMES = {
  mitemite: MITEMITE,
  kikasete: KIKASETE,
} as const satisfies Record<ThemeName, Theme>;
