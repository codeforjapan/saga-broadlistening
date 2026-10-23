import type { ExternalIdentityProviderKey } from "@mirai-gikai/shared/external-identity/providers";

/**
 * 外部アプリから受け取った UID を保持する Cookie の名前。
 * 連携元ごとに別の Cookie にし、複数の連携元が共存できるようにする。
 */
export function getExternalUidCookieName(
  providerKey: ExternalIdentityProviderKey
): string {
  return `external_uid_${providerKey}`;
}

/**
 * 受け取り前の UID フラグメントを一時的に置く window のプロパティ名。
 * root layout のインラインスクリプト（最初の JS 実行時点で URL から除去する）と、
 * サーバーへ送る Client Component の間の受け渡しにだけ使う。
 */
export const PENDING_UID_FRAGMENT_WINDOW_KEY = "__chikatPendingUidFragment";

/** 送信に失敗した UID フラグメントを次のページ遷移まで残す sessionStorage のキー */
export const PENDING_UID_FRAGMENT_STORAGE_KEY = "chikat:pending-uid-fragment";

/** UID を受け取る Route Handler のパス */
export const EXTERNAL_IDENTITY_CAPTURE_PATH = "/api/external-identity";
