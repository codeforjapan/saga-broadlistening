import { describe, expect, it } from "vitest";
import { readExternalUidClaims } from "./external-uid-cookies";

describe("readExternalUidClaims", () => {
  it("連携元の Cookie から UID を読み取る", () => {
    expect(
      readExternalUidClaims([
        { name: "bill_difficulty_level", value: "normal" },
        { name: "external_uid_saga_super_app", value: "abc-123" },
      ])
    ).toEqual([{ providerKey: "saga_super_app", externalUid: "abc-123" }]);
  });

  it("Cookie がない・不正な値なら空配列", () => {
    expect(readExternalUidClaims([])).toEqual([]);
    expect(
      readExternalUidClaims([
        { name: "external_uid_saga_super_app", value: "abc def" },
      ])
    ).toEqual([]);
    expect(
      readExternalUidClaims([{ name: "external_uid_unknown", value: "abc" }])
    ).toEqual([]);
  });
});
