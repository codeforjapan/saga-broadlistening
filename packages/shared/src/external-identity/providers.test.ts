import { describe, expect, it } from "vitest";
import {
  collectExternalUidClaims,
  findExternalIdentityProvider,
  isExternalIdentityProviderKey,
  parseExternalUid,
  SAGA_SUPER_APP_PROVIDER,
} from "./providers";

describe("連携元レジストリ", () => {
  it("キーの判定と検索が登録済みの連携元だけに反応する", () => {
    expect(isExternalIdentityProviderKey("saga_super_app")).toBe(true);
    expect(isExternalIdentityProviderKey("unknown")).toBe(false);
    expect(findExternalIdentityProvider("saga_super_app")).toBe(
      SAGA_SUPER_APP_PROVIDER
    );
    expect(findExternalIdentityProvider("unknown")).toBeNull();
  });
});

describe("parseExternalUid", () => {
  const uid = "123e4567-e89b-42d3-a456-426614174000";

  it("UUID 形式の値をそのまま返す", () => {
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, uid)).toBe(uid);
  });

  it("大文字の UUID も受け付け、表記は変えない", () => {
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, uid.toUpperCase())).toBe(
      uid.toUpperCase()
    );
  });

  it("前後の空白を除いて返す", () => {
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, `  ${uid} `)).toBe(uid);
  });

  it("空・null は null", () => {
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "")).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "   ")).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, null)).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, undefined)).toBeNull();
  });

  it("UUID 形式でない値は null", () => {
    expect(
      parseExternalUid(SAGA_SUPER_APP_PROVIDER, "someone+saga@example.com")
    ).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "null")).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "test-webview-1")).toBeNull();
    // 16 進数以外の文字・桁数違い・ハイフンなし
    expect(
      parseExternalUid(SAGA_SUPER_APP_PROVIDER, uid.replace("e", "g"))
    ).toBeNull();
    expect(
      parseExternalUid(SAGA_SUPER_APP_PROVIDER, `${uid}0`)
    ).toBeNull();
    expect(
      parseExternalUid(SAGA_SUPER_APP_PROVIDER, uid.replaceAll("-", ""))
    ).toBeNull();
  });
});

describe("collectExternalUidClaims", () => {
  it("検証を通った連携元の UID だけを集める", () => {
    const uid = "123e4567-e89b-42d3-a456-426614174000";
    expect(collectExternalUidClaims(() => uid)).toEqual([
      { providerKey: "saga_super_app", externalUid: uid },
    ]);
    expect(collectExternalUidClaims(() => "abc-123")).toEqual([]);
    expect(collectExternalUidClaims(() => undefined)).toEqual([]);
  });
});
