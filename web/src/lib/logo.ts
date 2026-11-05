/**
 * サービスロゴの寸法ユーティリティ
 *
 * ロゴは2バリアントある。表示サイズが小さい箇所ではタグラインが数pxに潰れて
 * ロゴ自体の視認性を下げるため、タグラインを外した compact を使う。
 *
 * `next/image` / Satori はいずれも width/height をそのまま出力するので、実比率と
 * ずれた値を渡すとレイアウトシフト（CLS）や縦横比の歪みが起きる。各表示箇所では
 * 高さだけを決め、幅と参照先はバリアントから導出する。
 */

const LOGO_VARIANTS = {
  /** にっこりマーク + CHIKATワードマーク + タグライン。大きく見せる箇所用 */
  full: { src: "/img/logo.svg", viewBox: { width: 546, height: 279 } },
  /** タグラインを外した版。ヘッダーなど小さく見せる箇所用 */
  compact: {
    src: "/img/logo-compact.svg",
    viewBox: { width: 546, height: 210.4 },
  },
} as const;

export type LogoVariant = keyof typeof LOGO_VARIANTS;

/**
 * 表示したい高さから、`next/image` に渡す src / width / height を求める。
 *
 * src と縦横比を必ずセットで返すことで、「compactのSVGにfullの比率」のような
 * 取り違えが起きないようにしている。
 */
export function logoImageProps(
  variant: LogoVariant,
  height: number
): { src: string; width: number; height: number } {
  const { src, viewBox } = LOGO_VARIANTS[variant];
  return {
    src,
    width: Math.round((height * viewBox.width) / viewBox.height),
    height,
  };
}
