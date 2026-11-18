import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestInterviewMessages,
  createTestOpinion,
  createTestSession,
  createTestUser,
  type TestUser,
} from "../utils";
import { trackInterviewConfigs } from "./helpers";

async function insertInterviewMessage(
  sessionId: string,
  createdAt: string,
  role: "assistant" | "user" = "user"
) {
  const { error } = await adminClient.from("interview_messages").insert({
    interview_session_id: sessionId,
    role,
    content: `dropout test ${createdAt}`,
    created_at: createdAt,
  });
  if (error) throw new Error(`interview_messages 作成失敗: ${error.message}`);
}

describe("get_interview_statistics() 関数", () => {
  let testUser: TestUser;
  const configs = trackInterviewConfigs();

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await configs.cleanup();
    await cleanupTestUser(testUser.id);
  });

  it("セッション数・完了数を正しく集計する", async () => {
    const configId = await configs.createConfigId();

    const now = new Date();
    const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    await createTestSession(configId, testUser.id, {
      completed_at: fiveMinLater,
    });
    await createTestSession(configId, testUser.id, {
      completed_at: fiveMinLater,
    });
    await createTestSession(configId, testUser.id);

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].total_sessions).toBe(3);
    expect(data?.[0].completed_sessions).toBe(2);
  });

  it("満足度の平均を正しく計算する", async () => {
    const configId = await configs.createConfigId();

    await createTestSession(configId, testUser.id, { rating: 5 });
    await createTestSession(configId, testUser.id, { rating: 3 });
    await createTestSession(configId, testUser.id); // rating なし

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    // AVG(5, 3, NULL) = 4.00
    expect(Number(data?.[0].avg_rating)).toBeCloseTo(4.0, 1);
  });

  it("情報充実度の平均を正しく計算する", async () => {
    const configId = await configs.createConfigId();

    const s1 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s1.id, { content_richness: { total: 80 } });
    const s2 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s2.id, { content_richness: { total: 60 } });

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    expect(Number(data?.[0].avg_total_content_richness)).toBeCloseTo(70.0, 0);
  });

  it("平均メッセージ数を正しく計算する（0件セッション含む）", async () => {
    const configId = await configs.createConfigId();

    const s1 = await createTestSession(configId, testUser.id);
    await createTestInterviewMessages(s1.id, 6);
    const s2 = await createTestSession(configId, testUser.id);
    await createTestInterviewMessages(s2.id, 4);
    await createTestSession(configId, testUser.id); // 0件

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    // AVG(6, 4, 0) = 3.3 （COALESCE で0件も含む）
    expect(Number(data?.[0].avg_message_count)).toBeCloseTo(3.3, 0);
  });

  it("本人が公開に同意した件数（public_by_user_count）を集計する", async () => {
    const configId = await configs.createConfigId();

    const s1 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s1.id, { is_public_by_user: true });
    const s2 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s2.id, { is_public_by_user: false });
    const s3 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s3.id, { is_public_by_user: true });

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    expect(data?.[0].public_by_user_count).toBe(2);
  });

  it("公開済み件数（published_count）を集計する", async () => {
    const configId = await configs.createConfigId();

    const s1 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s1.id, {
      review_status: "published",
      is_public_by_user: true,
      is_public_by_admin: true,
    });
    // 本人が公開に同意していても published でなければ数えない
    const s2 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s2.id, {
      review_status: "pending_review",
      is_public_by_user: true,
    });
    const s3 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s3.id, {
      review_status: "hidden",
      is_public_by_user: true,
    });
    // 意見が未作成のセッション
    await createTestSession(configId, testUser.id);

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    expect(data?.[0].published_count).toBe(1);
    expect(data?.[0].public_by_user_count).toBe(3);
  });

  it("別のconfigのデータは含まれない", async () => {
    const configId1 = await configs.createConfigId();
    await createTestSession(configId1, testUser.id);

    const configId2 = await configs.createConfigId();
    await createTestSession(configId2, testUser.id);
    await createTestSession(configId2, testUser.id);

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId1,
    });

    expect(error).toBeNull();
    expect(data?.[0].total_sessions).toBe(1);
  });

  it("フィードバックタグ集計を正しく行う", async () => {
    const configId = await configs.createConfigId();

    const s1 = await createTestSession(configId, testUser.id, { rating: 2 });
    const s2 = await createTestSession(configId, testUser.id, { rating: 1 });
    const s3 = await createTestSession(configId, testUser.id, { rating: 3 });

    // s1: irrelevant_questions, not_aligned
    await adminClient.from("interview_rating_feedbacks").insert([
      { interview_session_id: s1.id, tag: "irrelevant_questions" as const },
      { interview_session_id: s1.id, tag: "not_aligned" as const },
    ]);
    // s2: irrelevant_questions, misunderstood, other
    await adminClient.from("interview_rating_feedbacks").insert([
      { interview_session_id: s2.id, tag: "irrelevant_questions" as const },
      { interview_session_id: s2.id, tag: "misunderstood" as const },
      { interview_session_id: s2.id, tag: "other" as const },
    ]);
    // s3: too_many_questions
    await adminClient
      .from("interview_rating_feedbacks")
      .insert([
        { interview_session_id: s3.id, tag: "too_many_questions" as const },
      ]);

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    expect(data?.[0].feedback_irrelevant_questions).toBe(2);
    expect(data?.[0].feedback_not_aligned).toBe(1);
    expect(data?.[0].feedback_misunderstood).toBe(1);
    expect(data?.[0].feedback_too_many_questions).toBe(1);
    expect(data?.[0].feedback_other).toBe(1);
  });

  it("フィードバックがない場合はゼロを返す", async () => {
    const configId = await configs.createConfigId();

    await createTestSession(configId, testUser.id, { rating: 5 });

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    expect(data?.[0].feedback_irrelevant_questions).toBe(0);
    expect(data?.[0].feedback_not_aligned).toBe(0);
    expect(data?.[0].feedback_misunderstood).toBe(0);
    expect(data?.[0].feedback_too_many_questions).toBe(0);
    expect(data?.[0].feedback_other).toBe(0);
  });

  it("総所要時間を完了セッションと途中離脱セッションの両方で集計する", async () => {
    const configId = await configs.createConfigId();

    const base = new Date("2026-05-20T00:00:00.000Z").getTime();
    const iso = (offsetSec: number) =>
      new Date(base + offsetSec * 1000).toISOString();

    // 完了セッション: 300秒
    await createTestSession(configId, testUser.id, {
      started_at: iso(0),
      completed_at: iso(300),
    });
    // 完了セッション: 120秒
    await createTestSession(configId, testUser.id, {
      started_at: iso(0),
      completed_at: iso(120),
    });
    // 途中離脱（未完了）: 最終メッセージ 180秒
    const dropout = await createTestSession(configId, testUser.id, {
      started_at: iso(0),
    });
    await insertInterviewMessage(dropout.id, iso(60));
    await insertInterviewMessage(dropout.id, iso(180));
    // 途中離脱（メッセージなし）: 計算対象外
    await createTestSession(configId, testUser.id, { started_at: iso(0) });

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    // 300 + 120 + 180 = 600
    expect(Number(data?.[0].total_duration_seconds)).toBeCloseTo(600, 0);
  });

  it("該当セッションが無い場合 total_duration_seconds は 0", async () => {
    const configId = await configs.createConfigId();

    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: configId,
    });

    expect(error).toBeNull();
    expect(Number(data?.[0].total_duration_seconds)).toBe(0);
  });

  it("存在しないconfig_idではすべてゼロ/NULLの行を返す", async () => {
    const { data, error } = await adminClient.rpc("get_interview_statistics", {
      p_config_id: "00000000-0000-0000-0000-000000000000",
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].total_sessions).toBe(0);
    expect(data?.[0].completed_sessions).toBe(0);
    expect(data?.[0].avg_rating).toBeNull();
    expect(data?.[0].public_by_user_count).toBe(0);
    expect(data?.[0].published_count).toBe(0);
    expect(Number(data?.[0].total_duration_seconds)).toBe(0);
  });
});
