import { describe, expect, it } from "vitest";
import { readExternalUidClaims } from "./external-uid-cookies";

const UID = "123e4567-e89b-42d3-a456-426614174000";

describe("readExternalUidClaims", () => {
  it("連携元の Cookie から UID を読み取る", () => {
    expect(
      readExternalUidClaims([
        { name: "bill_difficulty_level", value: "normal" },
        { name: "external_uid_saga_super_app", value: UID },
      ])
    ).toEqual([{ providerKey: "saga_super_app", externalUid: UID }]);
  });

  it("Cookie がない・不正な値なら空配列", () => {
    expect(readExternalUidClaims([])).toEqual([]);
    expect(
      readExternalUidClaims([
        { name: "external_uid_saga_super_app", value: "abc-123" },
      ])
    ).toEqual([]);
    expect(
      readExternalUidClaims([{ name: "external_uid_unknown", value: "abc" }])
    ).toEqual([]);
  });
});
