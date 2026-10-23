import { describe, expect, it } from "vitest";
import { buildInterviewParticipationView } from "./build-interview-participation-view";

const rule = {
  name: "若者支援",
  participation_mode: "external_identity" as const,
  allowed_provider_keys: ["saga_super_app"],
};

describe("buildInterviewParticipationView", () => {
  it("参加できるときは案内情報を渡さない", () => {
    expect(
      buildInterviewParticipationView({ allowed: true, rule, guideUrls: {} })
    ).toEqual({ kind: "allowed" });
  });

  it("許可された連携元の表示名と設定済み案内URLだけを渡す", () => {
    expect(
      buildInterviewParticipationView({
        allowed: false,
        rule,
        guideUrls: { saga_super_app: "https://www.city.saga.lg.jp/guide" },
      })
    ).toEqual({
      kind: "guide",
      themeName: "若者支援",
      providers: [
        {
          key: "saga_super_app",
          displayName: "佐賀市スーパーアプリ",
          guideUrl: "https://www.city.saga.lg.jp/guide",
        },
      ],
    });
  });

  it.each([
    undefined,
    "",
    "invalid",
    "javascript:alert(1)",
  ])("案内URLが未設定・不正なときはリンクを作らない (%s)", (url) => {
    const result = buildInterviewParticipationView({
      allowed: false,
      rule,
      guideUrls: { saga_super_app: url },
    });
    expect(result).toMatchObject({
      kind: "guide",
      themeName: "若者支援",
      providers: [{ guideUrl: null }],
    });
  });

  it("未登録の連携元に案内URLを誤って割り当てない", () => {
    expect(
      buildInterviewParticipationView({
        allowed: false,
        rule: { ...rule, allowed_provider_keys: ["unknown"] },
        guideUrls: {},
      })
    ).toEqual({ kind: "guide", themeName: "若者支援", providers: [] });
  });
});
