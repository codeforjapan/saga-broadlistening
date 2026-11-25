import { BRAND_CONFIG } from "@mirai-gikai/branding/config";
/**
 * テーマ（意見募集）のSNSシェア用OGP画像URLを解決する。
 * 優先順位: テーマの表示用画像 > デフォルトOGP。
 * テーマ配下のページ（トピック等）もテーマの画像を流用するため共通化している。
 */
export function resolveThemeShareImageUrl(
  thumbnailUrl: string | null | undefined,
  webUrl: string
): string {
  return (
    thumbnailUrl || new URL(BRAND_CONFIG.assets.ogpImage.src, webUrl).toString()
  );
}
