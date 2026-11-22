/**
 * テーマの仕組み（自治体で共通。fork 先は書き換えない）。
 *
 * テーマはサービスの役割で分ける。施策紹介などサイト全体の土台が `default`、
 * AIインタビューの画面が `interview`。各テーマの値は自治体ごとに brand.themes.ts に書く。
 *
 * `tokens.css` では `default` を `:root, .theme-default`、ほかを `.theme-<name>` の
 * 変数として出力する。ラッパーにクラスを付けると、配下の `bg-primary`・`font-heading`
 * などがそのテーマの値になる。クラスのないページ（admin を含む）は `default` の値になる。
 */

import type { PrimitiveToken } from "./palette";

export const THEME_NAMES = ["default", "interview"] as const;
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
  /**
   * 飾りの色（進捗バーの塗り・見出しの線アイコンなど）。
   * 文字を載せない面・線・アイコン専用なので、対白 4.5:1 に満たない鮮やかな色を使える
   */
  | "decor";

export interface Theme {
  colors: Record<ThemeColorToken, PrimitiveToken>;
  /** 見出し（h1〜h4・`font-heading`）の書体。値は各アプリの next/font の変数への参照 */
  headingFont: string;
  /** ページの地（`bg-page`）。CSS の background に入る値 */
  pageBackground: string;
}

/** `default` 以外のテーマ。書いた値だけを `default` に上書きする */
export type ThemeOverride = {
  colors?: Partial<Theme["colors"]>;
  headingFont?: string;
  pageBackground?: string;
};

/** brand.themes.ts の形。`default` はすべての値を持ち、ほかは差分だけを書く */
export type BrandThemes = { default: Theme } & Record<
  Exclude<ThemeName, "default">,
  ThemeOverride
>;
