import { fetchTargetOpinions } from "@mirai-gikai/topic-analysis-core/repository";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanupTestInterviewConfig } from "./db-function/helpers";
import {
  adminClient,
  cleanupTestPolicy,
  cleanupTestUser,
  createTestInterviewData,
  createTestOpinion,
  createTestUser,
  type TestUser,
} from "./utils";

// Supabase/PostgREST の既定行数上限（1000）を超えても全件取得できることを検証する。
const SEGMENT_COUNT = 1001;

let user: TestUser;
let policyId: string;
let interviewConfigId: string;

describe("fetchTargetOpinions ページネーション統合テスト", () => {
  beforeAll(async () => {
    user = await createTestUser();
    const { policy, config, session } = await createTestInterviewData(user.id);
    policyId = policy.id;
    interviewConfigId = config.id;

    // §8 フィルタ（公開済み × モデレーションOK）を通す意見。
    const opinion = await createTestOpinion(session.id, {
      review_status: "published",
      is_public_by_user: true,
      is_public_by_admin: true,
      moderation_score: 5,
    });

    const rows = Array.from({ length: SEGMENT_COUNT }, (_, i) => ({
      opinion_id: opinion.id,
      opinion_index: i,
      title: `論点${i}`,
      content: `内容${i}`,
    }));
    const { error } = await adminClient.from("opinion_segments").insert(rows);
    if (error) {
      throw new Error(`opinion_segments 一括作成失敗: ${error.message}`);
    }
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(interviewConfigId);
    await cleanupTestPolicy(policyId);
    await cleanupTestUser(user.id);
  });

  it("対象論点が1000件を超えても全件取得する（既定上限で切れない）", async () => {
    const opinions = await fetchTargetOpinions(interviewConfigId);
    expect(opinions.length).toBe(SEGMENT_COUNT);
    // opinion_index の取りこぼし・重複が無いこと（0..SEGMENT_COUNT-1 が一意に揃う）。
    const indices = new Set(opinions.map((o) => o.opinion_index));
    expect(indices.size).toBe(SEGMENT_COUNT);
  });
});
