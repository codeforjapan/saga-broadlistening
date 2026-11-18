import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestOpinion,
  createTestSession,
  createTestUser,
  type TestUser,
} from "../utils";
import { createTestReactions, trackInterviewConfigs } from "./helpers";

/** 意見募集配下に意見を1件作成する（既定は公開済み） */
async function createOpinionInConfig(
  configId: string,
  userId: string,
  overrides: Partial<{
    total_content_richness: number;
    review_status: "published" | "pending_review" | "hidden";
  }> = {}
) {
  const session = await createTestSession(configId, userId);
  const totalRichness = overrides.total_content_richness ?? null;
  return await createTestOpinion(session.id, {
    review_status: overrides.review_status ?? "published",
    is_public_by_user: true,
    is_public_by_admin: true,
    ...(totalRichness != null
      ? { content_richness: { total: totalRichness } }
      : {}),
  });
}

describe("find_public_opinions_by_config_id_ordered_by_reactions() 関数", () => {
  let testUsers: TestUser[] = [];
  const configs = trackInterviewConfigs();

  beforeEach(async () => {
    testUsers = [
      await createTestUser(),
      await createTestUser(),
      await createTestUser(),
    ];
  });

  afterEach(async () => {
    await configs.cleanup();
    for (const user of testUsers) {
      await cleanupTestUser(user.id);
    }
    testUsers = [];
  });

  it("helpful×1+total_content_richnessの重み付きスコア降順で意見を返す", async () => {
    const configId = await configs.createConfigId();

    // opinion1: helpful x0, total_content_richness=80 → weighted=0+80=80
    const opinion1 = await createOpinionInConfig(configId, testUsers[0].id, {
      total_content_richness: 80,
    });

    // opinion2: helpful x2, total_content_richness=79 → weighted=2+79=81
    const opinion2 = await createOpinionInConfig(configId, testUsers[1].id, {
      total_content_richness: 79,
    });

    // opinion3: helpful x1, total_content_richness=80 → weighted=1+80=81
    const opinion3 = await createOpinionInConfig(configId, testUsers[2].id, {
      total_content_richness: 80,
    });

    await createTestReactions(opinion2.id, [testUsers[0].id], "helpful");
    await createTestReactions(opinion2.id, [testUsers[2].id], "helpful");
    await createTestReactions(opinion3.id, [testUsers[0].id], "helpful");

    const { data, error } = await adminClient.rpc(
      "find_public_opinions_by_config_id_ordered_by_reactions",
      { p_interview_config_id: configId }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    // opinion2 と opinion3 は同スコア → created_at 降順（後に作られた opinion3 が先）
    expect(data?.[0].id).toBe(opinion3.id);
    expect(data?.[1].id).toBe(opinion2.id);
    expect(data?.[2].id).toBe(opinion1.id);
  });

  it("hmmリアクションは重み付きスコアに影響しない", async () => {
    const configId = await configs.createConfigId();

    // opinion1: hmm x2, helpful x0, total_content_richness=80 → weighted=80
    const opinion1 = await createOpinionInConfig(configId, testUsers[0].id, {
      total_content_richness: 80,
    });

    // opinion2: helpful x1, total_content_richness=70 → weighted=1+70=71
    const opinion2 = await createOpinionInConfig(configId, testUsers[1].id, {
      total_content_richness: 70,
    });

    await createTestReactions(opinion1.id, [testUsers[1].id], "hmm");
    await createTestReactions(opinion1.id, [testUsers[2].id], "hmm");
    await createTestReactions(opinion2.id, [testUsers[0].id], "helpful");

    const { data, error } = await adminClient.rpc(
      "find_public_opinions_by_config_id_ordered_by_reactions",
      { p_interview_config_id: configId }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].id).toBe(opinion1.id);
    expect(data?.[1].id).toBe(opinion2.id);
  });

  it("helpfulが同数の場合はtotal_content_richnessの差で順序が決まる", async () => {
    const configId = await configs.createConfigId();

    const opinion1 = await createOpinionInConfig(configId, testUsers[0].id, {
      total_content_richness: 70,
    });
    const opinion2 = await createOpinionInConfig(configId, testUsers[1].id, {
      total_content_richness: 90,
    });

    const { data, error } = await adminClient.rpc(
      "find_public_opinions_by_config_id_ordered_by_reactions",
      { p_interview_config_id: configId }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].id).toBe(opinion2.id);
    expect(data?.[1].id).toBe(opinion1.id);
  });

  it("review_statusがpublishedでない意見は返さない", async () => {
    const configId = await configs.createConfigId();

    await createOpinionInConfig(configId, testUsers[0].id, {
      review_status: "pending_review",
    });
    await createOpinionInConfig(configId, testUsers[1].id, {
      review_status: "hidden",
    });
    const published = await createOpinionInConfig(configId, testUsers[2].id);

    const { data, error } = await adminClient.rpc(
      "find_public_opinions_by_config_id_ordered_by_reactions",
      { p_interview_config_id: configId }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].id).toBe(published.id);
  });

  it("別の意見募集の意見は返さない", async () => {
    const configId1 = await configs.createConfigId();
    const configId2 = await configs.createConfigId();

    const opinion1 = await createOpinionInConfig(configId1, testUsers[0].id);
    await createOpinionInConfig(configId2, testUsers[1].id);

    const { data, error } = await adminClient.rpc(
      "find_public_opinions_by_config_id_ordered_by_reactions",
      { p_interview_config_id: configId1 }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].id).toBe(opinion1.id);
  });

  it("p_limitで返却件数を制限できる", async () => {
    const configId = await configs.createConfigId();

    for (const user of testUsers) {
      await createOpinionInConfig(configId, user.id);
    }

    const { data, error } = await adminClient.rpc(
      "find_public_opinions_by_config_id_ordered_by_reactions",
      { p_interview_config_id: configId, p_limit: 2 }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });

  it("p_offsetでスキップできる", async () => {
    const configId = await configs.createConfigId();

    await createOpinionInConfig(configId, testUsers[0].id, {
      total_content_richness: 90,
    });
    const opinion2 = await createOpinionInConfig(configId, testUsers[1].id, {
      total_content_richness: 80,
    });
    const opinion3 = await createOpinionInConfig(configId, testUsers[2].id, {
      total_content_richness: 70,
    });

    const { data, error } = await adminClient.rpc(
      "find_public_opinions_by_config_id_ordered_by_reactions",
      { p_interview_config_id: configId, p_offset: 1 }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].id).toBe(opinion2.id);
    expect(data?.[1].id).toBe(opinion3.id);
  });

  it("p_sort_order='newest'で作成日時降順にソートされる", async () => {
    const configId = await configs.createConfigId();

    // opinion1: 最古・最高スコア（helpful x2, total_content_richness=90）
    const opinion1 = await createOpinionInConfig(configId, testUsers[0].id, {
      total_content_richness: 90,
    });
    const opinion2 = await createOpinionInConfig(configId, testUsers[1].id, {
      total_content_richness: 50,
    });
    const opinion3 = await createOpinionInConfig(configId, testUsers[2].id, {
      total_content_richness: 10,
    });

    await createTestReactions(opinion1.id, [testUsers[1].id], "helpful");
    await createTestReactions(opinion1.id, [testUsers[2].id], "helpful");

    const { data, error } = await adminClient.rpc(
      "find_public_opinions_by_config_id_ordered_by_reactions",
      { p_interview_config_id: configId, p_sort_order: "newest" }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    // おすすめ順なら opinion1 が先頭だが、新着順では作成が新しい順になる
    expect(data?.[0].id).toBe(opinion3.id);
    expect(data?.[1].id).toBe(opinion2.id);
    expect(data?.[2].id).toBe(opinion1.id);
  });

  it("p_sort_order='recommended'（デフォルト）で重み付きスコア降順にソートされる", async () => {
    const configId = await configs.createConfigId();

    const opinion1 = await createOpinionInConfig(configId, testUsers[0].id, {
      total_content_richness: 10,
    });
    const opinion2 = await createOpinionInConfig(configId, testUsers[1].id, {
      total_content_richness: 90,
    });

    const { data, error } = await adminClient.rpc(
      "find_public_opinions_by_config_id_ordered_by_reactions",
      { p_interview_config_id: configId, p_sort_order: "recommended" }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.[0].id).toBe(opinion2.id);
    expect(data?.[1].id).toBe(opinion1.id);
  });
});
