/**
 * シャドウトークン（要求仕様3.4 / D-6）
 *
 * 佐賀市要望により、背景と文字掲載部分の区切りは**線ではなくシャドウ**で表現する。
 *
 * シャドウ色は常に `base/ink` 系（黒の半透明）を使い、有彩色のシャドウ
 * （黄色いシャドウ等）は使わない。フォーカスリングのみ `sky/700` 由来。
 */

import { hexToRgb } from "./contrast";
import { PRIMITIVES } from "./palette";

/** hex を `rgba(r, g, b, a)` 文字列にする。値の二重管理を避けるための変換 */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const INK = PRIMITIVES["base-ink"];
const RING = PRIMITIVES["sky-700"];

export const SHADOWS = {
  /** 既定。カード・入力欄など、面を背景から浮かせる */
  card: `0 1px 2px ${rgba(INK, 0.06)}, 0 1px 1px ${rgba(INK, 0.04)}`,
  /** 一段強い浮き上がり。ホバー・モーダルなど */
  raised: `0 2px 6px ${rgba(INK, 0.08)}`,
  /** フォーカスリング。輪郭のみで、色そのものはアウトライン扱い */
  focus: `0 0 0 3px ${rgba(RING, 0.35)}`,
} as const;

export type ShadowToken = keyof typeof SHADOWS;
