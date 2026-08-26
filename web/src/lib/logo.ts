/**
 * サービスロゴの寸法ユーティリティ
 *
 * ロゴは横長のロックアップ（にっこりマーク + CHIKATワードマーク + タグライン）。
 * `next/image` / Satori はいずれも width/height をそのまま出力するため、実比率と
 * ずれた値を渡すとレイアウトシフト（CLS）や縦横比の歪みが起きる。各表示箇所では
 * 高さだけを決め、幅はここから導出する。
 *
 * OGP用のラスター版 `img/ogp-logo.png` も、ここで求まる表示枠の整数倍で書き出して
 * いるので同じ比率に乗る。
 */

/** logo.svg の viewBox 実寸 */
const VIEWBOX = { width: 546, height: 279 } as const;

/**
 * 表示したい高さから、viewBoxの縦横比を保った width/height を求める
 */
export function logoSizeForHeight(height: number): {
  width: number;
  height: number;
} {
  return {
    width: Math.round((height * VIEWBOX.width) / VIEWBOX.height),
    height,
  };
}
