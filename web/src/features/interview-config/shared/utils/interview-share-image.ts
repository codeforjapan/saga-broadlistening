import { OGP_IMAGE } from "@mirai-gikai/branding/assets";
/**
 * テーマ（意見募集）のSNSシェア用OGP画像URLを解決する。
 * 優先順位: テーマの表示用画像 > デフォルトOGP。
 * テーマ配下のページ（トピック等）もテーマの画像を流用するため共通化している。
 */
export function resolveThemeShareImageUrl(
  thumbnailUrl: string | null | undefined,
  webUrl: string
): string {
  return thumbnailUrl || new URL(OGP_IMAGE.src, webUrl).toString();
}
