/**
 * 佐賀市AI公聴基盤 タイポグラフィトークン（要求仕様4章）
 *
 * ここが値の唯一の出所。`tokens.css` は
 * `pnpm --filter @mirai-gikai/design-tokens build:css` で本ファイルから生成する。
 *
 * ## 書体の受け渡し（web / admin 共通の約束）
 *
 * 実体は各アプリの `next/font/google` が定義するCSS変数を参照する。
 * 両アプリは以下の変数名で書体を公開すること。
 *
 * - `--font-noto-sans-jp`      本文（Noto Sans JP）
 * - `--font-zen-maru-gothic`   見出し（Zen Maru Gothic）
 * - `--font-noto-serif-jp`     引用（Noto Serif JP。web のみ利用）
 */

/** 書体ファミリー。値は各アプリが next/font で定義する変数への参照 */
export const FONT_FAMILIES = {
  sans: "var(--font-noto-sans-jp), system-ui, sans-serif",
  heading:
    "var(--font-zen-maru-gothic), var(--font-noto-sans-jp), system-ui, sans-serif",
  quote: "var(--font-noto-serif-jp), serif",
} as const;

/**
 * サイズ・行間スケール（D-16 で確定した値）
 *
 * `lineHeight` は倍率で指定する。固定px値にするとルビ表示ON/OFFで
 * 行の高さが変わったときにレイアウトが破綻するため（要求仕様4.2）。
 */
export const TEXT_SCALE = {
  h1: { size: "1.75rem", lineHeight: "1.35", fontWeight: "700" },
  h2: { size: "1.25rem", lineHeight: "1.5", fontWeight: "700" },
  body: { size: "1.0625rem", lineHeight: "1.8" },
  /** ルビ表示時。行間を追加確保する */
  "body-rubied": { size: "1.0625rem", lineHeight: "1.9" },
  button: { size: "1rem", lineHeight: "1.4", fontWeight: "700" },
  caption: { size: "0.875rem", lineHeight: "1.6" },
  /** 本文の60%。em 指定なので親のサイズに追従する */
  ruby: { size: "0.6em", lineHeight: "1.3" },

  // --- compact スケール（admin の一覧・ダッシュボード用。D-14） ---
  /** 情報密度の高い画面の本文 */
  "compact-body": { size: "0.9375rem", lineHeight: "1.6" },
  /** 同上の注釈・テーブルセル */
  "compact-caption": { size: "0.875rem", lineHeight: "1.5" },
} as const satisfies Record<
  string,
  { size: string; lineHeight: string; fontWeight?: string }
>;

export type TextToken = keyof typeof TEXT_SCALE;

/**
 * 本文の基準ウェイト（D-7「視認性向上のため太めの書体」）。
 * 従来の W400 から W500 に引き上げる。強調は 700。
 */
export const BODY_FONT_WEIGHT = "500";

/** 行間ユーティリティ。`leading-relaxed` はルビ用の余裕を持たせている */
export const LINE_HEIGHTS = {
  relaxed: "1.875",
} as const;
