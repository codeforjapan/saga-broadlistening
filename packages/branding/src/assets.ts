/**
 * ブランドアセットのパス（web / admin 共用）。
 * パスは brand.config.ts で設定する。
 */
import { BRAND_CONFIG } from "./brand.config";

/** インタビューチャットのAIアバターのデフォルト画像 */
const DEFAULT_CHAT_AVATAR_SRC = "/icons/ai-chat.svg";

/**
 * 指定パスが有効ならそれを、無効・未設定ならデフォルトを返す。
 *
 * `public/` 配下のローカルパス（`/` 始まり）のみ許可する。`//host/...` や
 * `https://...` などの外部参照は next/image の remotePatterns 検証を
 * すり抜けて（SVGは最適化をバイパスして直接読み込まれるため）外部ホストへ
 * 接続しうるので、デフォルトへフォールバックする。
 */
export function resolveAssetSrc(
  override: string | null | undefined,
  defaultSrc: string
): string {
  const trimmed = override?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return defaultSrc;
  }
  return trimmed;
}

/** インタビューチャットのAIアバターとして表示する画像のパス */
export const CHAT_AVATAR_SRC = resolveAssetSrc(
  BRAND_CONFIG.assets.chatAvatarSrc,
  DEFAULT_CHAT_AVATAR_SRC
);

/** ロゴ（full: タグラインあり / compact: タグラインなし） */
export const LOGO_IMAGES = {
  full: BRAND_CONFIG.assets.logo,
  compact: BRAND_CONFIG.assets.logoCompact,
} as const;

/** 動的OGP画像に埋め込むラスター版ロゴのパス */
export const OGP_LOGO_SRC = BRAND_CONFIG.assets.ogpLogoSrc;

/** サイト共通のOGP画像 */
export const OGP_IMAGE = BRAND_CONFIG.assets.ogpImage;
