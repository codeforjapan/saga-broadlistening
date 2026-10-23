import { describe, expect, it } from "vitest";
import { parseUidFragment } from "./uid-fragment";

const UID = "123e4567-e89b-42d3-a456-426614174000";

describe("parseUidFragment", () => {
  it("#uid=... から佐賀市スーパーアプリの UID を読み取る", () => {
    expect(parseUidFragment(`#uid=${UID}`)).toEqual({
      providerKey: "saga_super_app",
      externalUid: UID,
    });
  });

  it("先頭の # がなくても読み取る", () => {
    expect(parseUidFragment(`uid=${UID}`)?.externalUid).toBe(UID);
  });

  it("他のパラメータと混在していても読み取る", () => {
    expect(parseUidFragment(`#foo=bar&uid=${UID}`)?.externalUid).toBe(UID);
  });

  it("空・アンカーのみ・不正な値は null", () => {
    expect(parseUidFragment("")).toBeNull();
    expect(parseUidFragment("#chat-log")).toBeNull();
    expect(parseUidFragment("#uid=")).toBeNull();
    expect(parseUidFragment("#uid=abc%20def")).toBeNull();
    expect(parseUidFragment("#other=1")).toBeNull();
  });
});
