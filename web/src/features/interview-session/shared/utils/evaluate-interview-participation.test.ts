import { describe, expect, it } from "vitest";
import { evaluateInterviewParticipation } from "./evaluate-interview-participation";

const saga = { id: "id-saga", providerKey: "saga_super_app" as const };
const external = {
  participation_mode: "external_identity" as const,
  allowed_provider_keys: ["saga_super_app"],
};
const pub = {
  participation_mode: "public" as const,
  allowed_provider_keys: [],
};

describe("evaluateInterviewParticipation", () => {
  it("public は外部IDが無くても回答でき、記録する外部IDは null", () => {
    expect(
      evaluateInterviewParticipation({ rule: pub, identities: [] })
    ).toEqual({ allowed: true, externalIdentityId: null });
  });

  it("public でも紐付きがあれば外部IDを記録する", () => {
    expect(
      evaluateInterviewParticipation({ rule: pub, identities: [saga] })
    ).toEqual({ allowed: true, externalIdentityId: "id-saga" });
  });

  it("external_identity は許可された連携元の外部IDが無ければ拒否する", () => {
    expect(
      evaluateInterviewParticipation({ rule: external, identities: [] })
    ).toEqual({ allowed: false, externalIdentityId: null });
  });

  it("プレビューは参加条件を問わず、外部IDがあれば記録する", () => {
    expect(
      evaluateInterviewParticipation({
        rule: external,
        identities: [],
        isPreview: true,
      })
    ).toEqual({ allowed: true, externalIdentityId: null });
    expect(
      evaluateInterviewParticipation({
        rule: external,
        identities: [saga],
        isPreview: true,
      }).externalIdentityId
    ).toBe("id-saga");
  });

  it("許可された連携元の外部IDを優先して記録する", () => {
    const other = { id: "id-other", providerKey: "saga_super_app" as const };
    const result = evaluateInterviewParticipation({
      rule: { ...external, allowed_provider_keys: [] },
      identities: [other, saga],
      isPreview: true,
    });
    // 許可一覧が空なら先頭（Cookie 由来）を記録する
    expect(result.externalIdentityId).toBe("id-other");
  });
});
