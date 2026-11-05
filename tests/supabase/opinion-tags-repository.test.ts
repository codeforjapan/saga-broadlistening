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
  adminClient,
  cleanupTestInterviewConfig,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestOpinionWithSegments,
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
  return await createTestOpinionWithSegments({
    interviewConfigId: opts.configId,
    userId: opts.userId,
    session: { started_at: opts.createdAt, completed_at: opts.createdAt },
    opinion: {
      is_public_by_user: opts.isPublicByUser,
      summary: "サマリ",
      role_title: "教員",
    },
    segments: Array.from({ length: opts.segmentCount }, () => ({
      tags_extracted_at: opts.tagged ? opts.createdAt : null,
    })),
  });
}

describe("opinion-tags repository 統合テスト", () => {
  let testUser: TestUser;
  let configId: string;
  const scopedConfigIds: string[] = [];

  /**
   * テスト専用のテーマを作る。
   * 件数を突き合わせるテストは、他のテストが作ったデータに影響されないよう
   * 共有テーマ（configId）ではなくこちらを使う。
   */
  async function createScopedConfig(name: string): Promise<string> {
    const config = await createTestInterviewConfig({ name });
    scopedConfigIds.push(config.id);
    return config.id;
  }

  beforeAll(async () => {
    testUser = await createTestUser();
    configId = (await createTestInterviewConfig({ name: "tag-test" })).id;
  });

  afterAll(async () => {
    for (const scopedConfigId of scopedConfigIds.splice(0)) {
      await cleanupTestInterviewConfig(scopedConfigId);
    }
    await cleanupTestInterviewConfig(configId);
    await cleanupTestUser(testUser.id);
  });

  it("reasoning_types は NOT NULL DEFAULT '{}' で入る", async () => {
    const { opinionId } = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-01-01T00:00:00Z",
      segmentCount: 1,
    });

    const { data } = await adminClient
      .from("opinion_segments")
      .select("reasoning_types, concern, proposal, tags_extracted_at")
      .eq("opinion_id", opinionId)
      .single();

    expect(data?.reasoning_types).toEqual([]);
    expect(data?.concern).toBeNull();
    expect(data?.proposal).toBeNull();
    expect(data?.tags_extracted_at).toBeNull();
  });

  it("countPendingTagExtraction は interviewConfigId で絞り込める", async () => {
    const otherConfigId = await createScopedConfig("tag-test-count");
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
    const otherConfigId = await createScopedConfig("tag-test-find");
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

    expect(ids).toContain(target.opinionId);
    expect(ids).not.toContain(alreadyTagged.opinionId);
    // 立場はプロンプト接地に使うので載っていること
    const found = opinions.find((o) => o.opinionId === target.opinionId);
    expect(found?.roleTitle).toBe("教員");
    expect(found?.sessionId).toBe(target.sessionId);
  });

  it("findOpinionsToTag は limit 件の意見に束ねる（論点数ではない）", async () => {
    const limitConfigId = await createScopedConfig("tag-test-limit");
    // 1意見3論点 × 2意見あっても limit=1 なら意見1件だけ返る
    for (const createdAt of ["2024-03-03T00:00:00Z", "2024-03-04T00:00:00Z"]) {
      await createOpinionWithSegments({
        configId: limitConfigId,
        userId: testUser.id,
        isPublicByUser: true,
        createdAt,
        segmentCount: 3,
      });
    }

    const opinions = await findOpinionsToTag(1, limitConfigId);
    expect(opinions).toHaveLength(1);
  });

  it("updateOpinionSegmentTags はタグ列だけ更新し、本文を変えない", async () => {
    const { opinionId } = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-04-01T00:00:00Z",
      segmentCount: 2,
    });

    await updateOpinionSegmentTags(
      opinionId,
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
      .eq("opinion_id", opinionId)
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
    const { opinionId } = await createOpinionWithSegments({
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
      .eq("opinion_id", opinionId);

    await updateOpinionSegmentTags(
      opinionId,
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
      .eq("opinion_id", opinionId)
      .single();

    expect(data?.concern).toBe("先に入っていた値");
  });

  it("findUntaggedOpinionSegments は未タグの論点だけを index 昇順で返す", async () => {
    const { opinionId } = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-06-01T00:00:00Z",
      segmentCount: 3,
    });
    await markOpinionSegmentsTagAttempted(
      opinionId,
      [1],
      "2024-06-02T00:00:00Z"
    );

    const segments = await findUntaggedOpinionSegments(opinionId);

    expect(segments.map((s) => s.opinion_index)).toEqual([0, 2]);
  });

  it("resetTagExtractionForInterviewConfig は該当テーマのウォーターマークだけ戻す", async () => {
    const otherConfigId = await createScopedConfig("tag-test-reset");
    // タグ付け済み2論点 + 未タグ1論点
    await createOpinionWithSegments({
      configId: otherConfigId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-07-01T00:00:00Z",
      segmentCount: 2,
      tagged: true,
    });
    await createOpinionWithSegments({
      configId: otherConfigId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2024-07-02T00:00:00Z",
      segmentCount: 1,
    });

    const beforeOther = await countPendingTagExtraction(otherConfigId);
    const beforeMain = await countPendingTagExtraction(configId);
    expect(beforeOther).toBe(1);

    const reset = await resetTagExtractionForInterviewConfig(otherConfigId);
    const afterOther = await countPendingTagExtraction(otherConfigId);
    const afterMain = await countPendingTagExtraction(configId);

    expect(reset).toBe(2);
    expect(afterOther).toBe(beforeOther + reset);
    // 別テーマは影響を受けない
    expect(afterMain).toBe(beforeMain);
  });
});
