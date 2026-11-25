import { describe, expect, it } from "vitest";
import {
  canParticipateInInterview,
  DEFAULT_PARTICIPATION_MODE,
  PARTICIPATION_MODE_DESCRIPTIONS,
  PARTICIPATION_MODE_LABELS,
  VALID_PARTICIPATION_MODES,
} from "./participation-mode";

describe("参加条件の定数", () => {
  it("全モードにラベルと説明がある", () => {
    for (const mode of VALID_PARTICIPATION_MODES) {
      expect(PARTICIPATION_MODE_LABELS[mode]).toBeTruthy();
      expect(PARTICIPATION_MODE_DESCRIPTIONS[mode]).toBeTruthy();
    }
  });

  it("既定値は public", () => {
    expect(DEFAULT_PARTICIPATION_MODE).toBe("public");
  });
});

describe("canParticipateInInterview", () => {
  it("public は外部IDの有無によらず回答できる", () => {
    const rule = {
      participation_mode: "public" as const,
      allowed_provider_keys: [],
    };
    expect(canParticipateInInterview({ rule, linkedProviderKeys: [] })).toBe(
      true
    );
    expect(
      canParticipateInInterview({
        rule,
        linkedProviderKeys: ["saga_super_app"],
      })
    ).toBe(true);
  });

  it("external_identity は許可された連携元の外部IDがあるときだけ回答できる", () => {
    const rule = {
      participation_mode: "external_identity" as const,
      allowed_provider_keys: ["saga_super_app"],
    };
    expect(canParticipateInInterview({ rule, linkedProviderKeys: [] })).toBe(
      false
    );
    expect(
      canParticipateInInterview({ rule, linkedProviderKeys: ["other_app"] })
    ).toBe(false);
    expect(
      canParticipateInInterview({
        rule,
        linkedProviderKeys: ["other_app", "saga_super_app"],
      })
    ).toBe(true);
  });

  it("external_identity で許可一覧が空なら誰も回答できない", () => {
    expect(
      canParticipateInInterview({
        rule: {
          participation_mode: "external_identity",
          allowed_provider_keys: [],
        },
        linkedProviderKeys: ["saga_super_app"],
      })
    ).toBe(false);
  });
});
