import { describe, expect, it } from "vitest";
import { toParticipationFormValues } from "./participation-form-values";

describe("toParticipationFormValues", () => {
  it("未保存なら既定（public・連携元なし）", () => {
    expect(toParticipationFormValues(null)).toEqual({
      participation_mode: "public",
      allowed_provider_keys: [],
    });
  });

  it("レジストリにない連携元キーは落とす", () => {
    expect(
      toParticipationFormValues({
        participation_mode: "external_identity",
        allowed_provider_keys: ["saga_super_app", "unknown_app"],
      })
    ).toEqual({
      participation_mode: "external_identity",
      allowed_provider_keys: ["saga_super_app"],
    });
  });
});
