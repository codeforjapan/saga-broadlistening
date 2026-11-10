import {
  EXTERNAL_IDENTITY_PROVIDERS,
  parseExternalUid,
} from "@mirai-gikai/shared/external-identity/providers";

/**
 * 【一時的な診断用（#146）】外部アプリから開かれた URL の UID の「形」だけを表す。
 * WebView ではアドレスバーもログも見られないため、画面に出して形式を確かめる。
 * 値そのものは返さない（英字は a、数字は 0 に置き換え、記号だけ残す）。
 */
export type UidLaunchDescription = {
  /** `#` 以降のパラメータ名 */
  hashKeys: string[];
  /** `?` 以降のパラメータ名 */
  searchKeys: string[];
  /** UID パラメータがあったときだけ。形式チェックを通るかも返す */
  uid: { length: number; shape: string; valid: boolean } | null;
};

const SHAPE_MAX_LENGTH = 64;

/**
 * 診断を出すのは develop ブランチのデプロイ（`*-git-develop-*.vercel.app`）だけ。
 * develop は VERCEL_TARGET_ENV が staging にならないため、ホスト名で判定する。
 */
export function isUidLaunchDebugHost(hostname: string): boolean {
  return hostname.includes("-git-develop-");
}

/** 英字を a、数字を 0、空白を ␣ に置き換え、記号はそのまま残す */
export function toUidShape(value: string): string {
  const shape = [...value]
    .map((char) => {
      if (/[A-Za-z]/.test(char)) return "a";
      if (/[0-9]/.test(char)) return "0";
      if (/\s/.test(char)) return "␣";
      return char;
    })
    .join("");
  return shape.length > SHAPE_MAX_LENGTH
    ? `${shape.slice(0, SHAPE_MAX_LENGTH)}…`
    : shape;
}

function paramKeys(params: URLSearchParams): string[] {
  return [...new Set(params.keys())];
}

export function describeUidLaunch(
  hash: string,
  search: string
): UidLaunchDescription {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(search.replace(/^\?/, ""));

  // `#uid=` を優先し、無ければ `?uid=` で渡されていないかも見る
  let uid: UidLaunchDescription["uid"] = null;
  for (const provider of EXTERNAL_IDENTITY_PROVIDERS) {
    const raw =
      hashParams.get(provider.uidFragmentParam) ??
      searchParams.get(provider.uidFragmentParam);
    if (raw === null) continue;
    uid = {
      length: raw.length,
      shape: toUidShape(raw),
      valid:
        hashParams.has(provider.uidFragmentParam) &&
        parseExternalUid(provider, raw) !== null,
    };
    break;
  }

  return {
    hashKeys: paramKeys(hashParams),
    searchKeys: paramKeys(searchParams),
    uid,
  };
}
