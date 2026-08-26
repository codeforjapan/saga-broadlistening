import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestOpinion,
  createTestSession,
  createTestUser,
  type TestUser,
} from "../utils";
import { trackInterviewConfigs } from "./helpers";

let sessionCounter = 0;

/** 作成順を started_at で確定させたセッションを作る */
async function createOrderedSession(
  configId: string,
  userId: string,
  completedAt?: string
) {
  sessionCounter++;
  return await createTestSession(configId, userId, {
    started_at: new Date(Date.now() - sessionCounter * 1000).toISOString(),
    completed_at: completedAt ?? null,
  });
}

describe("find_sessions_ordered_by_total_content_richness() フィルタパラメータ", () => {
  let testUser: TestUser;
  const configs = trackInterviewConfigs();

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await configs.cleanup();
    await cleanupTestUser(testUser.id);
  });

  it("p_statusでcompletedセッションのみフィルタできる", async () => {
    const configId = await configs.createConfigId();

    const completed = await createOrderedSession(
      configId,
      testUser.id,
      new Date().toISOString()
    );
    await createTestOpinion(completed.id, { content_richness: { total: 60 } });

    const inProgress = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(inProgress.id, { content_richness: { total: 90 } });

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_status: "completed",
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].session_id).toBe(completed.id);
  });

  it("p_statusでin_progress/archivedを区別できる", async () => {
    const configId = await configs.createConfigId();

    const inProgress = await createOrderedSession(configId, testUser.id);
    const archived = await createOrderedSession(configId, testUser.id);
    await adminClient
      .from("interview_sessions")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", archived.id);

    const { data: inProgressRows } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_status: "in_progress",
      }
    );
    expect(inProgressRows).toHaveLength(1);
    expect(inProgressRows?.[0].session_id).toBe(inProgress.id);

    const { data: archivedRows } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_status: "archived",
      }
    );
    expect(archivedRows).toHaveLength(1);
    expect(archivedRows?.[0].session_id).toBe(archived.id);
  });

  it("p_visibility='public'は公開済み(published)の意見を持つセッションのみ返す", async () => {
    const configId = await configs.createConfigId();

    const published = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(published.id, {
      review_status: "published",
      content_richness: { total: 40 },
    });

    const pending = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(pending.id, {
      review_status: "pending_review",
      content_richness: { total: 80 },
    });

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_visibility: "public",
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].session_id).toBe(published.id);
  });

  it("p_visibility='private'は未公開の意見のセッションのみを返す", async () => {
    const configId = await configs.createConfigId();

    const published = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(published.id, { review_status: "published" });

    const hidden = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(hidden.id, { review_status: "hidden" });

    // 意見が未作成のセッションは public / private のどちらにも含めない
    // （PostgREST 側の opinions!inner を使う件数集計と一致させるため）
    const noOpinion = await createOrderedSession(configId, testUser.id);

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_visibility: "private",
      }
    );

    expect(error).toBeNull();
    const sessionIds = (data ?? []).map((r) => r.session_id);
    expect(sessionIds).toEqual([hidden.id]);
    expect(sessionIds).not.toContain(noOpinion.id);
    expect(sessionIds).not.toContain(published.id);
  });

  it("複数フィルタを組み合わせて絞り込める", async () => {
    const configId = await configs.createConfigId();

    // 完了 × 公開済み（唯一の該当）
    const target = await createOrderedSession(
      configId,
      testUser.id,
      new Date().toISOString()
    );
    await createTestOpinion(target.id, {
      review_status: "published",
      content_richness: { total: 50 },
    });

    // 完了だが未公開
    const completedPrivate = await createOrderedSession(
      configId,
      testUser.id,
      new Date().toISOString()
    );
    await createTestOpinion(completedPrivate.id, {
      review_status: "pending_review",
      content_richness: { total: 90 },
    });

    // 公開済みだが未完了
    const inProgressPublic = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(inProgressPublic.id, {
      review_status: "published",
      content_richness: { total: 95 },
    });

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
        p_status: "completed",
        p_visibility: "public",
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].session_id).toBe(target.id);
  });

  it("フィルタパラメータがNULLの場合はフィルタしない", async () => {
    const configId = await configs.createConfigId();

    const s1 = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(s1.id, { content_richness: { total: 30 } });

    const s2 = await createOrderedSession(configId, testUser.id);
    await createTestOpinion(s2.id, { content_richness: { total: 70 } });

    const { data, error } = await adminClient.rpc(
      "find_sessions_ordered_by_total_content_richness",
      {
        p_config_id: configId,
        p_ascending: false,
        p_offset: 0,
        p_limit: 10,
      }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].session_id).toBe(s2.id);
    expect(data?.[1].session_id).toBe(s1.id);
  });
});
