/**
 * ブランドアセットのパス（web / admin 共用）。
 * パスは brand.config.ts で設定する。
 */
import { BRAND_CONFIG } from "./brand.config";

/** インタビューチャットのAIアバターのデフォルト画像 */
const DEFAULT_CHAT_AVATAR_SRC = "/icons/ai-chat.svg";

/**
 * インタビューチャットのAIアバターとして表示する画像のパス。
 * brand.config.ts で null なら汎用のデフォルトを使う。
 * 指定したパスがローカルの実在ファイルであることは brand.config.test.ts で確認する
 */
export const CHAT_AVATAR_SRC =
  BRAND_CONFIG.assets.chatAvatarSrc ?? DEFAULT_CHAT_AVATAR_SRC;
