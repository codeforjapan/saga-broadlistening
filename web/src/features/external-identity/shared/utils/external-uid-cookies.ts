import {
  collectExternalUidClaims,
  type ExternalUidClaim,
} from "@mirai-gikai/shared/external-identity/providers";
import { getExternalUidCookieName } from "../constants";

/**
 * Cookie 一覧から、登録済み連携元の UID を読み取る。
 * 形式が不正な値は無視する。複数の連携元の Cookie があれば全部返す。
 */
export function readExternalUidClaims(
  cookies: { name: string; value: string }[]
): ExternalUidClaim[] {
  const byName = new Map(cookies.map((cookie) => [cookie.name, cookie.value]));
  return collectExternalUidClaims((provider) =>
    byName.get(getExternalUidCookieName(provider.key))
  );
}
