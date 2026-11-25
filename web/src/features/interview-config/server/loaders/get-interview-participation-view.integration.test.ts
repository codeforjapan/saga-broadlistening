import {
  cleanupTestExternalIdentityByUid,
  cleanupTestInterviewConfig,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestUser,
  uniqueSuffix,
} from "@test-utils/utils";
import { describe, expect, it } from "vitest";
import { resolveExternalIdentities } from "@/features/external-identity/server/services/resolve-external-identities";
import { getInterviewParticipationView } from "./get-interview-participation-view";

describe("サーバーで判定した回答導線", () => {
  it("未紐付けではテーマ名つき案内、紐付け後は回答ボタンへ切り替わる", async () => {
    const user = await createTestUser();
    const uid = `ui-${uniqueSuffix()}`;
    const config = await createTestInterviewConfig({
      name: "若者支援",
      participation_mode: "external_identity",
      allowed_provider_keys: ["saga_super_app"],
    });
    const getUser = async () => ({
      data: { user: { id: user.id } },
      error: null,
    });
    try {
      const denied = await getInterviewParticipationView(config, false, {
        getUser,
        getExternalIdentities: async () => [],
      });
      expect(denied).toMatchObject({
        kind: "guide",
        themeName: "若者支援",
        providers: [{ key: "saga_super_app" }],
      });
      const linked = await resolveExternalIdentities({
        userId: user.id,
        claims: [{ providerKey: "saga_super_app", externalUid: uid }],
      });
      const allowed = await getInterviewParticipationView(config, false, {
        getUser,
        getExternalIdentities: async () => linked,
      });
      expect(allowed).toEqual({ kind: "allowed" });
      expect(JSON.stringify(allowed)).not.toContain(uid);
      expect(JSON.stringify(denied)).not.toContain(uid);
    } finally {
      await cleanupTestInterviewConfig(config.id);
      await cleanupTestExternalIdentityByUid("saga_super_app", uid);
      await cleanupTestUser(user.id);
    }
  });

  it("public と検証済みプレビューは外部IDがなくても参加できる", async () => {
    const config = await createTestInterviewConfig();
    try {
      const deps = {
        getUser: async (): Promise<never> => {
          throw new Error("認証不要");
        },
      };
      expect(await getInterviewParticipationView(config, false, deps)).toEqual({
        kind: "allowed",
      });
      expect(
        await getInterviewParticipationView(
          {
            ...config,
            participation_mode: "external_identity",
            allowed_provider_keys: ["saga_super_app"],
          },
          true,
          deps
        )
      ).toEqual({ kind: "allowed" });
    } finally {
      await cleanupTestInterviewConfig(config.id);
    }
  });
});
