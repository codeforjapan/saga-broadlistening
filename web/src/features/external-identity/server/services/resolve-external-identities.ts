import "server-only";

import type { ExternalUidClaim } from "@mirai-gikai/shared/external-identity/providers";
import { mergeExternalIdentities } from "../../shared/utils/merge-external-identities";
import {
  type ExternalIdentityRef,
  findExternalIdentitiesByUserId,
  linkExternalIdentityToUser,
  upsertExternalIdentity,
} from "../repositories/external-identity-repository";

/**
 * Cookie の UID 主張と Supabase ユーザーから、紐付いた外部IDを解決する。
 *
 * - Cookie にある UID は external_identities に確定（再訪なら last_seen_at 更新）し、
 *   現在のユーザーへ紐付ける。
 * - Cookie が無くても、同じユーザーに過去の紐付けがあればそれも返す。
 * - 戻り値は Cookie 由来を先頭に、その後に既存の紐付け（新しい順）。先頭が
 *   回答（セッション）に記録する外部IDになる。
 *
 * 書き込みを伴うため、参加判定やセッション作成のように「いま紐付けを確定したい」
 * 場面から呼ぶ。外部IDの一致は会話の所有権を与えない（所有権は user_id で判定）。
 */
export async function resolveExternalIdentities(params: {
  userId: string;
  claims: ExternalUidClaim[];
}): Promise<ExternalIdentityRef[]> {
  const { userId, claims } = params;

  const linkClaim = async (claim: ExternalUidClaim) => {
    const identity = await upsertExternalIdentity(claim);
    await linkExternalIdentityToUser({
      externalIdentityId: identity.id,
      userId,
    });
    return identity;
  };

  // Cookie 由来の確定と既存の紐付けの取得は互いに依存しないので並列に走らせる
  const [fromCookies, linked] = await Promise.all([
    Promise.all(claims.map(linkClaim)),
    findExternalIdentitiesByUserId(userId),
  ]);

  return mergeExternalIdentities(fromCookies, linked);
}
