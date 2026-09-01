/**
 * 佐賀市AI公聴基盤 デザイントークン（案3-1 水色基調）
 *
 * ここが色の唯一の出所。`tokens.css` は `pnpm --filter @mirai-gikai/design-tokens build:css`
 * で本ファイルから生成する（`tokens-css.test.ts` が同期を検証する）。
 *
 * 値の根拠は Epic #8 の要求仕様3章。すべて `#FFFFFF` 背景上での使用を前提とする。
 */

/** プリミティブパレット。キーが CSS 変数名（`--color-<key>`）になる */
export const PRIMITIVES = {
  // Base
  "base-white": "#ffffff",
  "base-ink": "#2b2b2b",
  "base-ink-muted": "#5a6570",
  "base-surface": "#f4f7fa",

  // Sky（プライマリ／優先度1）
  "sky-50": "#eaf7ff",
  "sky-100": "#d6efff",
  "sky-200": "#aedfff",
  "sky-400": "#55c1ff",
  "sky-500": "#2fb0ff",
  "sky-700": "#0077c8",
  /**
   * 仕様3.1のパレットには無い拡張シェード（2026-09-01 追加、Epic #8 に記録）。
   * 本文の地が base-surface になったことで sky-700 の通常サイズ文字が
   * 有彩色面・薄グレー面上で 4.5:1 を割るため、文字用アクセントとして新設した。
   * base-surface 5.4:1 / sky-50 5.4:1 / sky-100 4.9:1。--ring は従来どおり sky-700。
   */
  "sky-800": "#0068af",

  // Green ＝ 黄緑（差し色／優先度2）
  "green-100": "#edf7dc",
  "green-400": "#8cc63f",
  "green-500": "#7ab32f",
  "green-700": "#55801a",

  // Yellow（差し色／優先度3）
  "yellow-400": "#ffd644",
  "yellow-700": "#8a6a00",

  // Lavender（差し色／優先度4）
  "lavender-300": "#e6e3fe",
  "lavender-500": "#7b6cf6",
  "lavender-600": "#5f4fd9",

  // System
  "system-destructive": "#d7263d",
  "system-success": "#55801a",
  "system-warning": "#b26a00",
} as const;

export type PrimitiveToken = keyof typeof PRIMITIVES;

/**
 * shadcn/ui セマンティック変数へのマッピング（要求仕様3.3）。
 *
 * `--primary-foreground` が `base-ink` である点が最重要。`sky-400` は対白 2.0:1 しかなく、
 * 白文字を載せると WCAG AA を満たさないため、有彩色の面に載せる文字は黒で統一する（D-13）。
 */
export const SEMANTICS = {
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
} as const satisfies Record<string, PrimitiveToken>;

export type SemanticToken = keyof typeof SEMANTICS;

/** セマンティックトークンの実際の色（hex）を返す */
export function resolveSemantic(token: SemanticToken): string {
  return PRIMITIVES[SEMANTICS[token]];
}


/**
 * shadcn/ui 標準の chart / sidebar トークン。
 *
 * web / admin の `globals.css` に同一内容で重複していたものを集約した。値は移行前の
 * stock shadcn（oklch）のままで、案3-1パレットへの割り当ては #14 で行う。
 * プリミティブと違い hex ではないため、`PRIMITIVES` とは別に管理する。
 */
export const SHADCN_UI_TOKENS = {
  "chart-1": "oklch(0.646 0.222 41.116)",
  "chart-2": "oklch(0.6 0.118 184.704)",
  "chart-3": "oklch(0.398 0.07 227.392)",
  "chart-4": "oklch(0.828 0.189 84.429)",
  "chart-5": "oklch(0.769 0.188 70.08)",
  sidebar: "oklch(0.985 0 0)",
  "sidebar-foreground": "oklch(0.145 0 0)",
  "sidebar-primary": "oklch(0.205 0 0)",
  "sidebar-primary-foreground": "oklch(0.985 0 0)",
  "sidebar-accent": "oklch(0.97 0 0)",
  "sidebar-accent-foreground": "oklch(0.205 0 0)",
  "sidebar-border": "oklch(0.922 0 0)",
  "sidebar-ring": "oklch(0.708 0 0)",
} as const;

export type ShadcnUiToken = keyof typeof SHADCN_UI_TOKENS;

/**
 * 面として使うトークン。この上に白文字を置いてはいけない（対白コントラストが低いため）。
 * `palette.test.ts` がこのリストに対して「白文字不可」を機械的に検証する。
 */
export const SURFACE_ONLY_TOKENS = [
  "sky-400",
  "sky-500",
  "green-400",
  "green-500",
  "yellow-400",
] as const satisfies readonly PrimitiveToken[];

/** 文字・アイコンに使えるトークン（`base-white` 背景で 4.5:1 以上） */
export const TEXT_SAFE_TOKENS = [
  "base-ink",
  "base-ink-muted",
  "sky-700",
  "sky-800",
  "green-700",
  "lavender-600",
  "yellow-700",
  "system-destructive",
  "system-success",
] as const satisfies readonly PrimitiveToken[];

/**
 * 白背景で 3:1 は満たすが 4.5:1 に届かないトークン。
 * アイコン・大テキスト・UI部品には使えるが、**通常サイズの本文には使えない**。
 *
 * `system-warning #B26A00` は要求仕様では「注意喚起テキスト」用途とされているが、
 * 実測 4.24:1 で WCAG AA（4.5:1）に届かない。注意喚起の文言には `yellow-700`
 * （5.4:1）を使い、`system-warning` はアイコン・境界線・バッジ面に限定する。
 * → 要求仕様の見直しを Epic #8 で確認中。
 */
export const LARGE_TEXT_ONLY_TOKENS = [
  "lavender-500",
  "system-warning",
] as const satisfies readonly PrimitiveToken[];
