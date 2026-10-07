import {
  collectExternalUidClaims,
  type ExternalUidClaim,
} from "@mirai-gikai/shared/external-identity/providers";

/**
 * `location.hash` から外部アプリの UID を読み取る。
 *
 * フラグメントはサーバーに届かないため、アクセスログや Referer に UID を残さずに
 * 受け取れる。`#uid=xxx` のほか `#uid=xxx&foo=bar` のような複数パラメータも扱う。
 * 形式が不正な値は無視して null を返す（「不正」と「未登録」を区別しない）。
 * URL からの除去は root layout のインラインスクリプト（early-capture-script）が行う。
 */
export function parseUidFragment(hash: string): ExternalUidClaim | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.includes("=")) return null;
  const params = new URLSearchParams(raw);
  return (
    collectExternalUidClaims((provider) =>
      params.get(provider.uidFragmentParam)
    )[0] ?? null
  );
}
