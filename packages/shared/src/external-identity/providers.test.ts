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
  it("UUID 形式の値をそのまま返す", () => {
    const uid = "123e4567-e89b-42d3-a456-426614174000";
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, uid)).toBe(uid);
  });

  it("前後の空白を除いて返す", () => {
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "  abc-123 ")).toBe(
      "abc-123"
    );
  });

  it("空・null は null", () => {
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "")).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "   ")).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, null)).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, undefined)).toBeNull();
  });

  it("URL で安全でない文字や長すぎる値は null", () => {
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "abc def")).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "abc/def")).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "<script>")).toBeNull();
    expect(
      parseExternalUid(SAGA_SUPER_APP_PROVIDER, "a".repeat(129))
    ).toBeNull();
    expect(parseExternalUid(SAGA_SUPER_APP_PROVIDER, "a".repeat(128))).toBe(
      "a".repeat(128)
    );
  });
});

describe("collectExternalUidClaims", () => {
  it("検証を通った連携元の UID だけを集める", () => {
    expect(collectExternalUidClaims(() => "abc-123")).toEqual([
      { providerKey: "saga_super_app", externalUid: "abc-123" },
    ]);
    expect(collectExternalUidClaims(() => "abc def")).toEqual([]);
    expect(collectExternalUidClaims(() => undefined)).toEqual([]);
  });
});
