/**
 * ブランドアセットのパス設定（web / admin 共用）
 *
 * fork先の自治体は `NEXT_PUBLIC_BRAND_*` 環境変数でパスを差し替えられる。
 * 未設定の場合はデフォルトのアセットを表示する。詳細は FORK_GUIDELINES.md を参照。
 *
 * 注意: Next.js は `process.env.NEXT_PUBLIC_*` への直接参照のみを
 * ビルド時にインライン化するため、環境変数の読み取りを変数に括り出さないこと。
 */

/** インタビューチャットのAIアバターのデフォルト画像 */
const DEFAULT_CHAT_AVATAR_SRC = "/icons/ai-chat.svg";

/**
 * 指定パスが有効ならそれを、無効・未設定ならデフォルトを返す。
 * 環境変数のインライン化の都合で env 読み取りと分離した純粋関数。
 *
 * `public/` 配下のローカルパス（`/` 始まり）のみ許可する。`//host/...` や
 * `https://...` などの外部参照は next/image の remotePatterns 検証を
 * すり抜けて（SVGは最適化をバイパスして直接読み込まれるため）外部ホストへ
 * 接続しうるので、デフォルトへフォールバックする。
 */
export function resolveAssetSrc(
  override: string | undefined,
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
  process.env.NEXT_PUBLIC_BRAND_CHAT_AVATAR_SRC,
  DEFAULT_CHAT_AVATAR_SRC
);
