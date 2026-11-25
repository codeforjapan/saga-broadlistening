/**
 * WCAG 2.1 のコントラスト比計算（純粋関数）
 *
 * 参照: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

export type Rgb = { r: number; g: number; b: number };

/** WCAG 2.1 の通常テキスト基準 */
export const AA_TEXT = 4.5;
/** WCAG 2.1 の大テキスト・UI部品・フォーカス表示の基準 */
export const AA_LARGE_TEXT_OR_UI = 3;

/** `#rgb` / `#rrggbb`（先頭 `#` は省略可）を 0-255 の RGB に変換する */
export function hexToRgb(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, "");
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`不正なhexカラーです: ${hex}`);
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

/** sRGB チャンネル値（0-255）を線形化する */
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** 相対輝度（0=黒, 1=白）を返す */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  );
}

/** 2色のコントラスト比（1〜21）を返す。引数の順序は結果に影響しない */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 通常テキストとして AA（4.5:1）を満たすか */
export function meetsAaText(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= AA_TEXT;
}

/** 大テキスト・UI部品・フォーカス表示として AA（3:1）を満たすか */
export function meetsAaLargeTextOrUi(
  foreground: string,
  background: string
): boolean {
  return contrastRatio(foreground, background) >= AA_LARGE_TEXT_OR_UI;
}
