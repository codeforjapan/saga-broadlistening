/**
 * 外部ID連携元（provider）のレジストリ。
 *
 * 佐賀市スーパーアプリは連携元の一つとして扱い、固有の名称や
 * UIDの受け取り仕様はここに閉じ込める。参加判定や保存ロジックには
 * 連携元固有の値を埋め込まない。将来 OAuth 等の連携元を追加するときは
 * キーと定義を1件足すだけでよく、DB の enum は増やさない。
 */

export type ExternalIdentityProvider = {
  /** 連携元の識別子。DB の external_identities.provider_key と一致させる */
  key: string;
  /** 利用者向けの表示名（案内文・admin の選択肢に使う） */
  displayName: string;
  /**
   * 外部アプリから本アプリを開くときに UID を載せる URL フラグメントのパラメータ名。
   * 例: `https://example.jp/#uid=xxxx`。正式名は連携元（OPTiM）と確認中の暫定値。
   */
  uidFragmentParam: string;
  /** UID の形式ルール。連携元ごとに異なり得るため関数で持つ */
  isValidUid: (value: string) => boolean;
};

/** 連携元と UID の組（形式検証済み。DB への紐付けはまだ行っていない） */
export type ExternalUidClaim = {
  providerKey: ExternalIdentityProviderKey;
  externalUid: string;
};

/**
 * 佐賀市スーパーアプリの UID 形式（暫定）。
 * 正式な形式（UUID か、桁数固定か）は OPTiM と確認中のため、
 * URL で安全に扱える文字種と長さだけを検証する。
 */
const SAGA_SUPER_APP_UID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export const SAGA_SUPER_APP_PROVIDER = {
  key: "saga_super_app",
  displayName: "佐賀市スーパーアプリ",
  uidFragmentParam: "uid",
  isValidUid: (value: string) => SAGA_SUPER_APP_UID_PATTERN.test(value),
} as const satisfies ExternalIdentityProvider;

/**
 * 登録済みの連携元。admin の選択肢・UID 受け取り・案内表示はこの一覧から引く。
 * キーの型と一覧はここから導出するので、追加はこの配列に1件足すだけでよい。
 */
export const EXTERNAL_IDENTITY_PROVIDERS = [
  SAGA_SUPER_APP_PROVIDER,
] as const satisfies readonly ExternalIdentityProvider[];

/** レジストリに登録済みの連携元（key がリテラル型に絞られている） */
export type RegisteredExternalIdentityProvider =
  (typeof EXTERNAL_IDENTITY_PROVIDERS)[number];

export type ExternalIdentityProviderKey =
  RegisteredExternalIdentityProvider["key"];

/** 連携元の UID フラグメントのパラメータ名一覧（インラインスクリプトに埋め込む） */
export const EXTERNAL_UID_FRAGMENT_PARAMS: readonly string[] =
  EXTERNAL_IDENTITY_PROVIDERS.map((provider) => provider.uidFragmentParam);

/** z.enum() 等に渡せる連携元キーのタプル */
export const EXTERNAL_IDENTITY_PROVIDER_KEYS = EXTERNAL_IDENTITY_PROVIDERS.map(
  (provider) => provider.key
) as [ExternalIdentityProviderKey, ...ExternalIdentityProviderKey[]];

export function isExternalIdentityProviderKey(
  value: string
): value is ExternalIdentityProviderKey {
  return (EXTERNAL_IDENTITY_PROVIDER_KEYS as string[]).includes(value);
}

export function findExternalIdentityProvider(
  key: string
): RegisteredExternalIdentityProvider | null {
  return (
    (
      EXTERNAL_IDENTITY_PROVIDERS as readonly RegisteredExternalIdentityProvider[]
    ).find((provider) => provider.key === key) ?? null
  );
}

/**
 * 連携元の UID を検証する。前後の空白を除いた値を返し、不正なら null。
 * 不正な値を「未登録」と区別しないため、呼び出し側は null を単に無視する。
 */
export function parseExternalUid(
  provider: ExternalIdentityProvider,
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return provider.isValidUid(trimmed) ? trimmed : null;
}

/**
 * 登録済みの連携元ごとに値を読み取り、検証を通った UID だけを集める。
 * URL フラグメントと Cookie のどちらから読む場合も、この1本で済ませる。
 */
export function collectExternalUidClaims(
  read: (
    provider: RegisteredExternalIdentityProvider
  ) => string | null | undefined
): ExternalUidClaim[] {
  const claims: ExternalUidClaim[] = [];
  for (const provider of EXTERNAL_IDENTITY_PROVIDERS) {
    const externalUid = parseExternalUid(provider, read(provider));
    if (externalUid) {
      claims.push({ providerKey: provider.key, externalUid });
    }
  }
  return claims;
}
