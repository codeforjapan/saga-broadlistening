import {
  countPendingTagExtraction,
  findOpinionsToTag,
  findUntaggedOpinionSegments,
  markOpinionSegmentsTagAttempted,
  resetTagExtractionForInterviewConfig,
  updateOpinionSegmentTags,
} from "@mirai-gikai/topic-analysis-core/repository";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupTestInterviewConfig,
  createTestSession,
} from "./db-function/helpers";
import {
  adminClient,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestOpinion,
  createTestUser,
  type TestUser,
} from "./utils";

/**
 * 意見タグ用リポジトリの統合テスト。
 *
 * ここで確かめたいのは PostgREST の実挙動に依存する部分。
 * - `opinions!inner(interview_sessions!inner(interview_config_id))`
 *   という2段ネストのテーマフィルタが実際に効くか
 * - 意見単位で束ねる dedup が chunk 件数分の意見を返すか
 * - compare-and-set（tags_extracted_at IS NULL）が既存タグを上書きしないか
 * これらはユニットテストでは落ちない。
 */

async function createOpinionWithSegments(opts: {
  configId: string;
  userId: string;
  isPublicByUser: boolean;
  createdAt: string;
  segmentCount: number;
  tagged?: boolean;
}) {
  const session = await createTestSession(opts.configId, opts.userId, {
    started_at: opts.createdAt,
    completed_at: opts.createdAt,
  });
  const opinion = await createTestOpinion(session.id, {
    is_public_by_user: opts.isPublicByUser,
    summary: "サマリ",
    role_title: "教員",
  });

  const rows = Array.from({ length: opts.segmentCount }, (_, i) => ({
    opinion_id: opinion.id,
    opinion_index: i,
    title: `論点${i}`,
    content: `内容${i}`,
    tags_extracted_at: opts.tagged ? opts.createdAt : null,
  }));
  const { error } = await adminClient.from("opinion_segments").insert(rows);
  if (error) throw new Error(`opinion_segments 作成失敗: ${error.message}`);

  return opinion;
}

describe("opinion-tags repository 統合テスト", () => {
  let testUser: TestUser;
  let configId: string;
  let otherConfigId: string;

  beforeAll(async () => {
    testUser = await createTestUser();
    configId = (await createTestInterviewConfig({ name: "tag-test" })).id;
    otherConfigId = (
      await createTestInterviewConfig({ name: "tag-test-other" })
    ).id;
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(configId);
    await cleanupTestInterviewConfig(otherConfigId);
    await cleanupTestUser(testUser.id);
  });

  it("reasoning_types は NOT NULL DEFAULT '{}' で入る", async () => {
    const opinion = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-01-01T00:00:00Z",
      segmentCount: 1,
    });

    const { data } = await adminClient
      .from("opinion_segments")
      .select("reasoning_types, concern, proposal, tags_extracted_at")
      .eq("opinion_id", opinion.id)
      .single();

    expect(data?.reasoning_types).toEqual([]);
    expect(data?.concern).toBeNull();
    expect(data?.proposal).toBeNull();
    expect(data?.tags_extracted_at).toBeNull();
  });

  it("countPendingTagExtraction は interviewConfigId で絞り込める", async () => {
    await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-02-01T00:00:00Z",
      segmentCount: 3,
    });
    await createOpinionWithSegments({
      configId: otherConfigId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-02-01T00:00:00Z",
      segmentCount: 2,
    });

    const otherPending = await countPendingTagExtraction(otherConfigId);
    expect(otherPending).toBe(2);
  });

  it("findOpinionsToTag は該当テーマの未タグ意見だけを返す", async () => {
    const target = await createOpinionWithSegments({
      configId: otherConfigId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-03-01T00:00:00Z",
      segmentCount: 3,
    });
    const alreadyTagged = await createOpinionWithSegments({
      configId: otherConfigId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-03-02T00:00:00Z",
      segmentCount: 1,
      tagged: true,
    });

    const opinions = await findOpinionsToTag(50, otherConfigId);
    const ids = opinions.map((o) => o.opinionId);

    expect(ids).toContain(target.id);
    expect(ids).not.toContain(alreadyTagged.id);
    // 立場はプロンプト接地に使うので載っていること
    const found = opinions.find((o) => o.opinionId === target.id);
    expect(found?.roleTitle).toBe("教員");
    expect(found?.sessionId).toBe(target.interview_session_id);
  });

  it("findOpinionsToTag は limit 件の意見に束ねる（論点数ではない）", async () => {
    // 1意見3論点 × 複数意見あっても limit=1 なら意見1件だけ返る
    const opinions = await findOpinionsToTag(1, otherConfigId);
    expect(opinions).toHaveLength(1);
  });

  it("updateOpinionSegmentTags はタグ列だけ更新し、本文を変えない", async () => {
    const opinion = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-04-01T00:00:00Z",
      segmentCount: 2,
    });

    await updateOpinionSegmentTags(
      opinion.id,
      [
        {
          opinionIndex: 0,
          concern: "健康影響が心配",
          proposal: null,
          reasoningTypes: ["professional_expertise"],
        },
      ],
      "2024-04-02T00:00:00Z"
    );

    const { data } = await adminClient
      .from("opinion_segments")
      .select(
        "opinion_index, title, concern, reasoning_types, tags_extracted_at"
      )
      .eq("opinion_id", opinion.id)
      .order("opinion_index");

    expect(data?.[0].title).toBe("論点0");
    expect(data?.[0].concern).toBe("健康影響が心配");
    expect(data?.[0].reasoning_types).toEqual(["professional_expertise"]);
    expect(data?.[0].tags_extracted_at).not.toBeNull();
    // 未指定の論点は触られない
    expect(data?.[1].concern).toBeNull();
    expect(data?.[1].tags_extracted_at).toBeNull();
  });

  // バックフィルは本番稼働中に走るため、対象抽出から更新までの間に
  // ライブ生成が同じ行にタグを書き込むことがある。それを上書きしない。
  it("updateOpinionSegmentTags はタグ付け済みの行を上書きしない", async () => {
    const opinion = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-05-01T00:00:00Z",
      segmentCount: 1,
      tagged: true,
    });
    await adminClient
      .from("opinion_segments")
      .update({ concern: "先に入っていた値" })
      .eq("opinion_id", opinion.id);

    await updateOpinionSegmentTags(
      opinion.id,
      [
        {
          opinionIndex: 0,
          concern: "あとから来た値",
          proposal: null,
          reasoningTypes: [],
        },
      ],
      "2024-05-02T00:00:00Z"
    );

    const { data } = await adminClient
      .from("opinion_segments")
      .select("concern")
      .eq("opinion_id", opinion.id)
      .single();

    expect(data?.concern).toBe("先に入っていた値");
  });

  it("findUntaggedOpinionSegments は未タグの論点だけを index 昇順で返す", async () => {
    const opinion = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-06-01T00:00:00Z",
      segmentCount: 3,
    });
    await markOpinionSegmentsTagAttempted(
      opinion.id,
      [1],
      "2024-06-02T00:00:00Z"
    );

    const segments = await findUntaggedOpinionSegments(opinion.id);

    expect(segments.map((s) => s.opinion_index)).toEqual([0, 2]);
  });

  it("resetTagExtractionForInterviewConfig は該当テーマのウォーターマークだけ戻す", async () => {
    const beforeOther = await countPendingTagExtraction(otherConfigId);
    const beforeMain = await countPendingTagExtraction(configId);

    const reset = await resetTagExtractionForInterviewConfig(otherConfigId);
    const afterOther = await countPendingTagExtraction(otherConfigId);
    const afterMain = await countPendingTagExtraction(configId);

    expect(reset).toBeGreaterThan(0);
    expect(afterOther).toBe(beforeOther + reset);
    // 別テーマは影響を受けない
    expect(afterMain).toBe(beforeMain);
  });
});
