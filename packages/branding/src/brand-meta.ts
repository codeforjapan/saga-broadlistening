/**
 * ブラウザ・OSに渡すブランドメタ情報（theme-color / PWA / 動的OG画像）
 *
 * CSS変数が使えない場所（`manifest.json`、`viewport.themeColor`、
 * Satori で描画する OG 画像など）から参照するための、hex 実値のエクスポート。
 * 値は必ず `PRIMITIVES` から引くこと。ここで hex を直書きしない。
 */

import { PRIMITIVES } from "./palette";

/**
 * ブラウザのUIバー・PWAのテーマ色。
 *
 * 大面積に載る色なので、D-5「大面積の渋いブルーを避ける」に従い `sky/400` を使う。
 * `sky/700` は対白4.7:1と可読性は高いが、ブラウザクロームを暗い青で埋めることになり
 * 案3-1の「明るくフレンドリー」（D-2）と衝突する。
 */
export const THEME_COLOR = PRIMITIVES["sky-400"];

/** PWA スプラッシュの背景。D-2 により白 */
export const BACKGROUND_COLOR = PRIMITIVES["base-white"];

/**
 * ページ遷移のプログレスバー（NextTopLoader）。
 *
 * 高さ数pxの細い線なので、面と同じ `sky/400`（対白2.0:1）では視認できない。
 * WCAG 2.1 のUI部品基準3:1を満たす `sky/700`（4.7:1）を使う。
 * THEME_COLOR とは意図的に別の値だが、出所は同じパレット。
 */
export const PROGRESS_BAR_COLOR = PRIMITIVES["sky-700"];

/**
 * 動的OG画像（`/api/og/report`）で使う色。
 *
 * Satori は CSS 変数を解決できないため hex 実値が必要になる。
 * 二重管理を避けるため、ここでパレットから引いた値を参照する。
 */
export const OG_COLORS = {
  /** 見出し・本文 */
  text: PRIMITIVES["base-ink"],
  /** 補足テキスト */
  textMuted: PRIMITIVES["base-ink-muted"],
  /** アクセント（バッジ・区切り線） */
  accent: PRIMITIVES["sky-700"],
  /** 背景 */
  background: PRIMITIVES["base-white"],
  /** バッジ面 */
  badgeSurface: PRIMITIVES["sky-50"],
  /**
   * 1200x630 の地のグラデーション両端。
   *
   * 大面積なので D-5「大面積の渋いブルーを避ける」に従い淡いトーンに留め、
   * sky（優先度1）から黄緑（優先度2）へ流す。
   * グラデーション文字列そのものではなく両端の色を持つのは、
   * このオブジェクトの値がすべてパレットのプリミティブであることを
   * `brand-meta.test.ts` が検証しているため。
   */
  canvasFrom: PRIMITIVES["sky-50"],
  canvasTo: PRIMITIVES["green-100"],
  /** カード枠のグラデーション両端。6pxの装飾なので濃淡をつけて奥行きを出す */
  frameFrom: PRIMITIVES["sky-400"],
  frameTo: PRIMITIVES["sky-700"],
} as const;
