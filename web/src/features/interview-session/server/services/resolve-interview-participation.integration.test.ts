import {
  adminClient,
  cleanupTestExternalIdentityByUid,
  cleanupTestUser,
  createTestInterviewConfig,
  cleanupTestInterviewConfig,
  createTestSession,
  createTestUser,
  type TestUser,
  uniqueSuffix,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveExternalIdentities } from "@/features/external-identity/server/services/resolve-external-identities";
import type { ExternalIdentityRef } from "@/features/external-identity/server/repositories/external-identity-repository";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { createStreamMock } from "@/test-utils/mock-language-model";
import { initializeInterviewChat } from "../loaders/initialize-interview-chat";
import type { GetUserFn } from "../utils/verify-session-ownership";
import { verifySessionAccess } from "../utils/verify-session-ownership";
import { archiveInterviewSessionCore } from "./archive-interview-session-core";
import { createInterviewSessionCore } from "./create-interview-session-core";
import { handleInterviewChatRequest } from "./handle-interview-chat-request";
import { InterviewParticipationDeniedError } from "./resolve-interview-participation";

const PROVIDER = "saga_super_app" as const;

function createGetUser(userId: string): GetUserFn {
  return async () => ({ data: { user: { id: userId } }, error: null });
}

const noIdentities = async (): Promise<ExternalIdentityRef[]> => [];

describe("参加制御（external_identity テーマ）統合テスト", () => {
  let user: TestUser;
  let uid: string;
  let linked: ExternalIdentityRef[];
  let config: Awaited<ReturnType<typeof createTestInterviewConfig>>;

  beforeEach(async () => {
    user = await createTestUser();
    uid = `uid-${uniqueSuffix()}`;
    linked = await resolveExternalIdentities({
      userId: user.id,
      claims: [{ providerKey: PROVIDER, externalUid: uid }],
    });
    config = await createTestInterviewConfig({
      participation_mode: "external_identity",
      allowed_provider_keys: [PROVIDER],
    });
  });

  afterEach(async () => {
    await cleanupTestInterviewConfig(config.id);
    await cleanupTestExternalIdentityByUid(PROVIDER, uid);
    await cleanupTestUser(user.id);
  });

  describe("initializeInterviewChat", () => {
    it("外部IDが紐付いていなければ回答を始めずにエラーにし、セッションを作らない", async () => {
      await expect(
        initializeInterviewChat(config, null, {
          getUser: createGetUser(user.id),
          getExternalIdentities: noIdentities,
        })
      ).rejects.toBeInstanceOf(InterviewParticipationDeniedError);

      const { count } = await adminClient
        .from("interview_sessions")
        .select("id", { count: "exact", head: true })
        .eq("interview_config_id", config.id);
      expect(count).toBe(0);
    });

    it("許可された連携元の外部IDが紐付いていれば、外部ID付きでセッションを作る", async () => {
      const result = await initializeInterviewChat(config, null, {
        getUser: createGetUser(user.id),
        getExternalIdentities: async () => linked,
        model: createStreamMock([]),
      });

      expect(result.session.external_identity_id).toBe(linked[0].id);
      expect(result.session.user_id).toBe(user.id);
    });

    it("プレビューでは参加条件を問わない（職員の確認用）", async () => {
      const result = await initializeInterviewChat(
        config,
        null,
        {
          getUser: createGetUser(user.id),
          getExternalIdentities: noIdentities,
          model: createStreamMock([]),
        },
        { skipParticipationCheck: true }
      );

      expect(result.session.external_identity_id).toBeNull();
    });
  });

  describe("createInterviewSessionCore（Server Action の本体）", () => {
    it("参加条件を満たさなければエラーにする", async () => {
      await expect(
        createInterviewSessionCore({
          interviewConfigId: config.id,
          deps: {
            getUser: createGetUser(user.id),
            getExternalIdentities: noIdentities,
          },
        })
      ).rejects.toBeInstanceOf(InterviewParticipationDeniedError);
    });
  });

  describe("handleInterviewChatRequest（チャット API）", () => {
    it("参加条件を満たさなければ INTERVIEW_PARTICIPATION_DENIED で拒否する", async () => {
      await expect(
        handleInterviewChatRequest({
          messages: [{ role: "user", content: "こんにちは" }],
          interviewConfigId: config.id,
          currentStage: "chat",
          userId: user.id,
          deps: {
            getExternalIdentities: noIdentities,
            resolveContext: async () => ({
              interviewConfig: config,
              bill: null,
              policyId: null,
              isPreview: false,
            }),
            getSession: async () => null,
            getMessages: async () => [],
          },
        })
      ).rejects.toMatchObject({
        name: "ChatError",
        code: ChatErrorCode.INTERVIEW_PARTICIPATION_DENIED,
      });
    });

    it("ChatError は 403 に対応するコードを持つ", () => {
      const error = new ChatError(ChatErrorCode.INTERVIEW_PARTICIPATION_DENIED);
      expect(error.code).toBe("INTERVIEW_PARTICIPATION_DENIED");
    });
  });

  describe("verifySessionAccess（完了 API・アーカイブ）", () => {
    it("所有者でも参加条件を満たさなければ拒否し、満たせば許可する", async () => {
      const session = await createTestSession(config.id, user.id);

      const denied = await verifySessionAccess(session.id, {
        getUser: createGetUser(user.id),
        getExternalIdentities: noIdentities,
      });
      expect(denied.authorized).toBe(false);

      const allowed = await verifySessionAccess(session.id, {
        getUser: createGetUser(user.id),
        getExternalIdentities: async () => linked,
      });
      expect(allowed).toEqual({ authorized: true, userId: user.id });
    });

    it("外部IDが一致しても他人のセッションは操作できない（所有権は user_id）", async () => {
      const other = await createTestUser(
        `test-other-${uniqueSuffix()}@example.com`
      );
      try {
        const session = await createTestSession(config.id, other.id);
        const result = await verifySessionAccess(session.id, {
          getUser: createGetUser(user.id),
          getExternalIdentities: async () => linked,
        });
        expect(result.authorized).toBe(false);
      } finally {
        await cleanupTestUser(other.id);
      }
    });

    it("アーカイブは参加条件を満たさないとエラーを返す", async () => {
      const session = await createTestSession(config.id, user.id);
      const result = await archiveInterviewSessionCore(session.id, {
        getUser: createGetUser(user.id),
        getExternalIdentities: noIdentities,
      });
      expect(result.success).toBe(false);

      const { data } = await adminClient
        .from("interview_sessions")
        .select("archived_at")
        .eq("id", session.id)
        .single();
      expect(data?.archived_at).toBeNull();
    });
  });
});
