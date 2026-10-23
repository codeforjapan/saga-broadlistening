import "server-only";

import { cookies } from "next/headers";
import { readExternalUidClaims } from "../../shared/utils/external-uid-cookies";
import type { ExternalIdentityRef } from "../repositories/external-identity-repository";
import { resolveExternalIdentities } from "./resolve-external-identities";

/** テスト時に DI で差し替えるための型（Cookie に依存するため関数ごと差し替える） */
export type GetExternalIdentitiesFn = (
  userId: string
) => Promise<ExternalIdentityRef[]>;

/**
 * リクエストの Cookie から UID を読み、認証済みユーザーに紐付いた外部IDを解決する。
 * Cookie に UID があれば外部IDの確定と紐付けの書き込みを伴う。
 * ユーザーは呼び出し側が既に認証しているものを渡す（二重に getUser しない）。
 */
export const resolveCurrentExternalIdentities: GetExternalIdentitiesFn = async (
  userId
) => {
  const cookieStore = await cookies();
  return resolveExternalIdentities({
    userId,
    claims: readExternalUidClaims(cookieStore.getAll()),
  });
};
