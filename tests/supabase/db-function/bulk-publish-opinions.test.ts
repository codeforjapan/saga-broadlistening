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

const THRESHOLDS = {
  p_max_moderation_score: 29,
  p_min_content_richness: 50,
};

async function readOpinion(opinionId: string) {
  const { data, error } = await adminClient
    .from("opinions")
    .select("review_status, is_public_by_admin, reviewed_by, reviewed_at")
    .eq("id", opinionId)
    .single();
  if (error) throw new Error(`opinions 取得失敗: ${error.message}`);
  return data;
}

describe("count_bulk_publish_opinion_targets / bulk_publish_opinions", () => {
  let testUser: TestUser;
  let reviewer: TestUser;
  const configs = trackInterviewConfigs();

  beforeEach(async () => {
    testUser = await createTestUser();
    reviewer = await createTestUser();
  });

  afterEach(async () => {
    await configs.cleanup();
    await cleanupTestUser(testUser.id);
    await cleanupTestUser(reviewer.id);
  });

  it("条件に合致する意見のみカウントされる", async () => {
    const configId = await configs.createConfigId();

    // 対象: 本人が公開に同意済み・レビュー保留中・しきい値を満たす
    const s1 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s1.id, {
      is_public_by_user: true,
      moderation_score: 20,
      content_richness: { total: 60 },
    });

    // 対象外: 本人が公開に同意していない
    const s2 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s2.id, {
      is_public_by_user: false,
      moderation_score: 10,
      content_richness: { total: 70 },
    });

    // 対象外: モデレーションスコアがしきい値超過
    const s3 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s3.id, {
      is_public_by_user: true,
      moderation_score: 50,
      content_richness: { total: 80 },
    });

    // 対象外: 情報充実度がしきい値未満
    const s4 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s4.id, {
      is_public_by_user: true,
      moderation_score: 10,
      content_richness: { total: 30 },
    });

    // 対象外: すでに公開済み（pending_review ではない）
    const s5 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s5.id, {
      is_public_by_user: true,
      is_public_by_admin: true,
      review_status: "published",
      moderation_score: 10,
      content_richness: { total: 60 },
    });

    // 対象外: 職員が非公開にした（hidden は自動公開の対象外）
    const s6 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s6.id, {
      is_public_by_user: true,
      review_status: "hidden",
      moderation_score: 10,
      content_richness: { total: 60 },
    });

    const { data, error } = await adminClient.rpc(
      "count_bulk_publish_opinion_targets",
      { p_config_id: configId, ...THRESHOLDS }
    );

    expect(error).toBeNull();
    expect(data).toBe(1);
  });

  it("moderation_scoreやtotal_content_richnessがNULLの意見は除外される", async () => {
    const configId = await configs.createConfigId();

    // moderation_score が NULL
    const s1 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s1.id, {
      is_public_by_user: true,
      content_richness: { total: 60 },
    });

    // content_richness が NULL（total_content_richness も NULL）
    const s2 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s2.id, {
      is_public_by_user: true,
      moderation_score: 10,
    });

    const { data, error } = await adminClient.rpc(
      "count_bulk_publish_opinion_targets",
      { p_config_id: configId, ...THRESHOLDS }
    );

    expect(error).toBeNull();
    expect(data).toBe(0);
  });

  it("別の意見募集の意見はカウントされない", async () => {
    const configId1 = await configs.createConfigId();
    const configId2 = await configs.createConfigId();

    const s1 = await createTestSession(configId1, testUser.id);
    await createTestOpinion(s1.id, {
      is_public_by_user: true,
      moderation_score: 10,
      content_richness: { total: 60 },
    });

    const s2 = await createTestSession(configId2, testUser.id);
    await createTestOpinion(s2.id, {
      is_public_by_user: true,
      moderation_score: 10,
      content_richness: { total: 60 },
    });

    const { data, error } = await adminClient.rpc(
      "count_bulk_publish_opinion_targets",
      { p_config_id: configId1, ...THRESHOLDS }
    );

    expect(error).toBeNull();
    expect(data).toBe(1);
  });

  it("bulk_publish_opinionsが対象意見のみ公開し件数を返す", async () => {
    const configId = await configs.createConfigId();

    const s1 = await createTestSession(configId, testUser.id);
    const target1 = await createTestOpinion(s1.id, {
      is_public_by_user: true,
      moderation_score: 20,
      content_richness: { total: 60 },
    });

    const s2 = await createTestSession(configId, testUser.id);
    const target2 = await createTestOpinion(s2.id, {
      is_public_by_user: true,
      moderation_score: 10,
      content_richness: { total: 80 },
    });

    // 対象外（モデレーションスコアがしきい値超過）
    const s3 = await createTestSession(configId, testUser.id);
    const notTarget = await createTestOpinion(s3.id, {
      is_public_by_user: true,
      moderation_score: 50,
      content_richness: { total: 80 },
    });

    const { data, error } = await adminClient.rpc("bulk_publish_opinions", {
      p_config_id: configId,
      ...THRESHOLDS,
    });

    expect(error).toBeNull();
    expect(data).toBe(2);

    for (const opinionId of [target1.id, target2.id]) {
      const updated = await readOpinion(opinionId);
      expect(updated.review_status).toBe("published");
      expect(updated.is_public_by_admin).toBe(true);
    }

    const untouched = await readOpinion(notTarget.id);
    expect(untouched.review_status).toBe("pending_review");
    expect(untouched.is_public_by_admin).toBe(false);
  });

  it("公開した意見にレビュー者（reviewed_by）とレビュー日時を記録する", async () => {
    const configId = await configs.createConfigId();

    const session = await createTestSession(configId, testUser.id);
    const opinion = await createTestOpinion(session.id, {
      is_public_by_user: true,
      moderation_score: 10,
      content_richness: { total: 60 },
    });

    const { error } = await adminClient.rpc("bulk_publish_opinions", {
      p_config_id: configId,
      ...THRESHOLDS,
      p_reviewed_by: reviewer.id,
    });
    expect(error).toBeNull();

    const updated = await readOpinion(opinion.id);
    expect(updated.reviewed_by).toBe(reviewer.id);
    expect(updated.reviewed_at).not.toBeNull();
  });

  it("countとbulk publishの件数が一致する", async () => {
    const configId = await configs.createConfigId();

    const s1 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s1.id, {
      is_public_by_user: true,
      moderation_score: 15,
      content_richness: { total: 70 },
    });

    const s2 = await createTestSession(configId, testUser.id);
    await createTestOpinion(s2.id, {
      is_public_by_user: true,
      moderation_score: 25,
      content_richness: { total: 55 },
    });

    const params = { p_config_id: configId, ...THRESHOLDS };
    const { data: count } = await adminClient.rpc(
      "count_bulk_publish_opinion_targets",
      params
    );
    const { data: published } = await adminClient.rpc(
      "bulk_publish_opinions",
      params
    );

    expect(count).toBe(published);
    expect(count).toBe(2);
  });
});
