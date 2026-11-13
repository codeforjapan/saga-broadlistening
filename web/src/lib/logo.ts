import { BRAND_CONFIG } from "@mirai-gikai/branding/config";

const LOGO_IMAGES = {
  full: BRAND_CONFIG.assets.logo,
  compact: BRAND_CONFIG.assets.logoCompact,
} as const;

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

// パスと実寸は brand.config.ts で設定する（full: タグラインあり / compact: なし）
export type LogoVariant = keyof typeof LOGO_IMAGES;

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
  const { src, width, height: naturalHeight } = LOGO_IMAGES[variant];
  return {
    src,
    width: Math.round((height * width) / naturalHeight),
    height,
  };
}
