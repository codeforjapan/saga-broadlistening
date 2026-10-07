import {
  adminClient,
  cleanupTestExternalIdentityByUid,
  cleanupTestInterviewConfig,
  cleanupTestPolicy,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestPolicy,
  createTestPreviewToken,
  createTestSession,
  createTestUser,
  linkPolicyToInterviewConfig,
  type TestUser,
  uniqueSuffix,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExternalIdentityRef } from "@/features/external-identity/server/repositories/external-identity-repository";
import { resolveExternalIdentities } from "@/features/external-identity/server/services/resolve-external-identities";
import { createStreamMock } from "@/test-utils/mock-language-model";
import { initializeInterviewChat } from "../loaders/initialize-interview-chat";
import type { GetUserFn } from "../utils/verify-session-ownership";
import { archiveInterviewSessionCore } from "./archive-interview-session-core";
import { handleInterviewChatRequest } from "./handle-interview-chat-request";
import { InterviewParticipationDeniedError } from "./resolve-interview-participation";
import { verifySessionAccess } from "./verify-session-access";

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
          deps: {
            getUser: createGetUser(user.id),
            getExternalIdentities: noIdentities,
          },
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
        deps: {
          getUser: createGetUser(user.id),
          getExternalIdentities: async () => linked,
          model: createStreamMock([]),
        },
      });

      expect(result.session.external_identity_id).toBe(linked[0].id);
      expect(result.session.user_id).toBe(user.id);

      const { data } = await adminClient
        .from("interview_sessions")
        .select("external_identity_id, user_id")
        .eq("id", result.session.id)
        .single();
      expect(data).toEqual({
        external_identity_id: linked[0].id,
        user_id: user.id,
      });
    });

    it("プレビューでは参加条件を問わない（職員の確認用）", async () => {
      const result = await initializeInterviewChat(config, null, {
        isPreview: true,
        deps: {
          getUser: createGetUser(user.id),
          getExternalIdentities: noIdentities,
          model: createStreamMock([]),
        },
      });

      expect(result.session.external_identity_id).toBeNull();
    });
  });

  describe("handleInterviewChatRequest（チャット API）", () => {
    const buildDeps = (
      isPreview: boolean,
      getExternalIdentities: () => Promise<ExternalIdentityRef[]>
    ) => ({
      getExternalIdentities,
      resolveContext: async () => ({
        interviewConfig: config,
        bill: null,
        policyId: null,
        isPreview,
      }),
      getMessages: async () => [],
    });

    it("参加条件を満たさなければ InterviewParticipationDeniedError で拒否する", async () => {
      await expect(
        handleInterviewChatRequest({
          messages: [{ role: "user", content: "こんにちは" }],
          interviewConfigId: config.id,
          currentStage: "chat",
          userId: user.id,
          deps: {
            ...buildDeps(false, noIdentities),
            getSession: async () => null,
          },
        })
      ).rejects.toBeInstanceOf(InterviewParticipationDeniedError);
    });

    it("プレビューでは外部IDが無くても拒否しない", async () => {
      const session = await createTestSession(config.id, user.id);
      const response = await handleInterviewChatRequest({
        messages: [{ role: "user", content: "こんにちは" }],
        interviewConfigId: config.id,
        currentStage: "chat",
        userId: user.id,
        deps: {
          ...buildDeps(true, noIdentities),
          getSession: async () => session,
          chatModel: createStreamMock([
            JSON.stringify({
              text: "こんにちは",
              quick_replies: [],
              question_id: null,
              topic_title: null,
              next_stage: "chat",
            }),
          ]),
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("verifySessionAccess（完了 API・アーカイブ）", () => {
    it("所有者でも参加条件を満たさなければ拒否し、満たせば許可する", async () => {
      const session = await createTestSession(config.id, user.id);

      const denied = await verifySessionAccess(session.id, undefined, {
        getUser: createGetUser(user.id),
        getExternalIdentities: noIdentities,
      });
      expect(denied.authorized).toBe(false);

      const allowed = await verifySessionAccess(session.id, undefined, {
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
        const result = await verifySessionAccess(session.id, undefined, {
          getUser: createGetUser(user.id),
          getExternalIdentities: async () => linked,
        });
        expect(result.authorized).toBe(false);
      } finally {
        await cleanupTestUser(other.id);
      }
    });

    it("有効なプレビュートークン（テーマに紐づく施策）なら参加条件を問わない", async () => {
      const policy = await createTestPolicy();
      try {
        await linkPolicyToInterviewConfig(policy.id, config.id);
        const token = await createTestPreviewToken(policy.id);
        const session = await createTestSession(config.id, user.id);

        const withToken = await verifySessionAccess(
          session.id,
          { preview: { policyId: policy.id, token: token.token } },
          {
            getUser: createGetUser(user.id),
            getExternalIdentities: noIdentities,
          }
        );
        expect(withToken.authorized).toBe(true);

        const wrongToken = await verifySessionAccess(
          session.id,
          { preview: { policyId: policy.id, token: "invalid" } },
          {
            getUser: createGetUser(user.id),
            getExternalIdentities: noIdentities,
          }
        );
        expect(wrongToken.authorized).toBe(false);

        const archived = await archiveInterviewSessionCore(session.id, {
          preview: { policyId: policy.id, token: token.token },
          deps: {
            getUser: createGetUser(user.id),
            getExternalIdentities: noIdentities,
          },
        });
        expect(archived.success).toBe(true);
        const { data } = await adminClient
          .from("interview_sessions")
          .select("archived_at")
          .eq("id", session.id)
          .single();
        expect(data?.archived_at).not.toBeNull();
      } finally {
        await cleanupTestPolicy(policy.id);
      }
    });

    it("別施策・期限切れのトークンでは免除せず、有効でも別所有者は拒否する", async () => {
      const policy = await createTestPolicy();
      const unrelated = await createTestPolicy();
      const other = await createTestUser();
      try {
        await linkPolicyToInterviewConfig(policy.id, config.id);
        const valid = await createTestPreviewToken(policy.id);
        const expired = await createTestPreviewToken(policy.id, {
          expires_at: new Date(Date.now() - 60_000).toISOString(),
        });
        const unrelatedToken = await createTestPreviewToken(unrelated.id);
        const session = await createTestSession(config.id, user.id);
        for (const preview of [
          { policyId: policy.id, token: expired.token },
          { policyId: unrelated.id, token: unrelatedToken.token },
        ]) {
          const result = await verifySessionAccess(
            session.id,
            { preview },
            {
              getUser: createGetUser(user.id),
              getExternalIdentities: noIdentities,
            }
          );
          expect(result.authorized).toBe(false);
        }
        const result = await verifySessionAccess(
          session.id,
          {
            preview: { policyId: policy.id, token: valid.token },
          },
          {
            getUser: createGetUser(other.id),
            getExternalIdentities: noIdentities,
          }
        );
        expect(result.authorized).toBe(false);
      } finally {
        await cleanupTestPolicy(policy.id);
        await cleanupTestPolicy(unrelated.id);
        await cleanupTestUser(other.id);
      }
    });

    it("アーカイブは参加条件を満たさないとエラーを返す", async () => {
      const session = await createTestSession(config.id, user.id);
      const result = await archiveInterviewSessionCore(session.id, {
        deps: {
          getUser: createGetUser(user.id),
          getExternalIdentities: noIdentities,
        },
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

describe("public テーマは外部IDを問わない", () => {
  it("verifySessionAccess は所有者なら外部IDを引かずに許可する", async () => {
    const user = await createTestUser();
    const config = await createTestInterviewConfig();
    try {
      const session = await createTestSession(config.id, user.id);
      const result = await verifySessionAccess(session.id, undefined, {
        getUser: createGetUser(user.id),
        getExternalIdentities: async () => {
          throw new Error("public では呼ばれないはず");
        },
      });
      expect(result).toEqual({ authorized: true, userId: user.id });
    } finally {
      await cleanupTestInterviewConfig(config.id);
      await cleanupTestUser(user.id);
    }
  });
});
