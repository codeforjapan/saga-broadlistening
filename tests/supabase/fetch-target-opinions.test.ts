import { fetchTargetOpinions } from "@mirai-gikai/topic-analysis-core/repository";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestInterviewData,
  createTestOpinion,
  createTestUser,
  type TestUser,
} from "./utils";

// Supabase/PostgREST の既定行数上限（1000）を超えても全件取得できることを検証する。
const SEGMENT_COUNT = 1001;

let user: TestUser;
let interviewConfigId: string;
let cleanupInterviewData: () => Promise<void>;

describe("fetchTargetOpinions ページネーション統合テスト", () => {
  beforeAll(async () => {
    user = await createTestUser();
    const { config, session, cleanup } = await createTestInterviewData(user.id);
    interviewConfigId = config.id;
    cleanupInterviewData = cleanup;

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
    await cleanupInterviewData();
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
