/**
 * サイト共通のブランド定数（web / admin 共用）。
 * 値は brand.config.ts で設定する。
 */
import { BRAND_CONFIG } from "./brand.config";

export const SITE_NAME = BRAND_CONFIG.siteName;

/** シェア文言などに使うハッシュタグ（先頭の # は含めない） */
export const SITE_HASHTAG = BRAND_CONFIG.hashtag;

/** コピーライト表記（フッター等で共通利用） */
export const COPYRIGHT_TEXT = BRAND_CONFIG.copyright;
