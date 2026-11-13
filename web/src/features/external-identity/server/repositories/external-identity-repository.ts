import "server-only";

import {
  type ExternalIdentityProviderKey,
  type ExternalUidClaim,
  isExternalIdentityProviderKey,
} from "@mirai-gikai/shared/external-identity/providers";
import { createAdminClient } from "@mirai-gikai/supabase";

export type ExternalIdentityRef = {
  id: string;
  providerKey: ExternalIdentityProviderKey;
};

/**
 * 連携元と UID の組で外部IDを1行に確定し、内部IDを返す。
 *
 * 初回は行を作り、再訪では既存行の last_seen_at だけを更新する
 * （first_seen_at は payload に含めないので上書きされない）。
 * 「未登録の UID」と「既知の UID」をレスポンスで区別しないため、常に upsert する。
 */
export async function upsertExternalIdentity(
  claim: ExternalUidClaim
): Promise<ExternalIdentityRef> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("external_identities")
    .upsert(
      {
        provider_key: claim.providerKey,
        external_uid: claim.externalUid,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "provider_key,external_uid" }
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to upsert external identity: ${error.message}`);
  }

  return { id: data.id, providerKey: claim.providerKey };
}

/**
 * 外部IDと Supabase ユーザーの紐付けを作る（既にあれば何もしない）。
 */
export async function linkExternalIdentityToUser(params: {
  externalIdentityId: string;
  userId: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("external_identity_users").upsert(
    {
      external_identity_id: params.externalIdentityId,
      user_id: params.userId,
    },
    { onConflict: "external_identity_id,user_id", ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(`Failed to link external identity: ${error.message}`);
  }
}

/**
 * ユーザーに紐付いている外部IDを、紐付けの新しい順に返す。
 * provider_key は text 列なので、レジストリにないキーの行はここで落とす。
 */
export async function findExternalIdentitiesByUserId(
  userId: string
): Promise<ExternalIdentityRef[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("external_identity_users")
    .select("external_identities!inner(id, provider_key)")
    .eq("user_id", userId)
    .order("linked_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch external identities: ${error.message}`);
  }

  return data.flatMap(({ external_identities: row }) =>
    isExternalIdentityProviderKey(row.provider_key)
      ? [{ id: row.id, providerKey: row.provider_key }]
      : []
  );
}
