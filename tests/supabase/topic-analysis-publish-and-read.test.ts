import {
  buildPublicTopicAnalysis,
  findPublishedAnalysis,
} from "@mirai-gikai/topic-analysis-core/public-server";
import {
  createVersion,
  finalizeVersion,
  publishVersion,
  saveTopicsAndAssignments,
  setVersionPublished,
} from "@mirai-gikai/topic-analysis-core/repository";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
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

/** session + opinion + opinion_segments を作り、論点IDの配列を返す。 */
async function createOpinionWithSegments(opts: {
  configId: string;
  userId: string;
  reviewStatus: "published" | "pending_review" | "hidden";
  moderationScore: number;
  segments: Array<{ title: string; content: string }>;
}): Promise<string[]> {
  const session = await createTestSession(opts.configId, opts.userId, {
    completed_at: new Date().toISOString(),
  });
  const opinion = await createTestOpinion(session.id, {
    review_status: opts.reviewStatus,
    is_public_by_user: true,
    is_public_by_admin: opts.reviewStatus === "published",
    moderation_score: opts.moderationScore,
    summary: "s",
  });

  const { data: segments, error } = await adminClient
    .from("opinion_segments")
    .insert(
      opts.segments.map((s, i) => ({
        opinion_id: opinion.id,
        opinion_index: i,
        title: s.title,
        content: s.content,
      }))
    )
    .select("id");
  if (error || !segments) {
    throw new Error(`opinion_segments 作成失敗: ${error?.message}`);
  }
  return segments.map((s) => s.id);
}

async function createCompletedVersion(
  interviewConfigId: string
): Promise<string> {
  const v = await createVersion({
    interviewConfigId,
    trigger: "manual",
    model: "m",
    promptVersion: "v1",
  });
  if (!v) throw new Error("version create returned null");
  await finalizeVersion(v.id, 0);
  return v.id;
}

describe("publish / 公開読み取り 統合テスト", () => {
  let testUser: TestUser;
  let configId: string;

  beforeAll(async () => {
    testUser = await createTestUser();
    configId = (await createTestInterviewConfig({ name: "uta-pub-test" })).id;
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(configId);
    await cleanupTestUser(testUser.id);
  });

  afterEach(async () => {
    // active(pending/running) を終端し、公開も全解除して次テストへ干渉させない
    await adminClient
      .from("topic_analysis_version")
      .update({ status: "failed", is_published: false })
      .eq("interview_config_id", configId)
      .in("status", ["pending", "running"]);
    await adminClient
      .from("topic_analysis_version")
      .update({ is_published: false })
      .eq("interview_config_id", configId);
  });

  it("publishVersion はテーマ内で公開を1版に保つ（旧版を降ろす）", async () => {
    const v1 = await createCompletedVersion(configId);
    await publishVersion(v1);
    const v2 = await createCompletedVersion(configId);
    await publishVersion(v2);

    const { data: rows } = await adminClient
      .from("topic_analysis_version")
      .select("id, is_published")
      .eq("interview_config_id", configId);
    const published = (rows ?? []).filter((r) => r.is_published);
    expect(published).toHaveLength(1);
    expect(published[0].id).toBe(v2);
  });

  it("setVersionPublished(false) で全非公開にできる", async () => {
    const v1 = await createCompletedVersion(configId);
    await publishVersion(v1);
    await setVersionPublished(v1, false);
    const { data: rows } = await adminClient
      .from("topic_analysis_version")
      .select("is_published")
      .eq("interview_config_id", configId);
    expect((rows ?? []).some((r) => r.is_published)).toBe(false);
  });

  it("公開版が無ければ findPublishedAnalysis は null", async () => {
    await createCompletedVersion(configId);
    expect(await findPublishedAnalysis(configId)).toBeNull();
  });

  it("公開読み取りは §8（公開済み×モデレーションOK）の論点だけ返し件数も再計算", async () => {
    // 公開済み×OK の論点1、レビュー保留中1、職員が非公開にしたもの1
    const okIds = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      reviewStatus: "published",
      moderationScore: 5,
      segments: [{ title: "ok", content: "c" }],
    });
    const pendingIds = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      reviewStatus: "pending_review",
      moderationScore: 5,
      segments: [{ title: "pending", content: "c" }],
    });
    const hiddenIds = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      reviewStatus: "hidden",
      moderationScore: 5,
      segments: [{ title: "hidden", content: "c" }],
    });

    const versionId = await createCompletedVersion(configId);
    await saveTopicsAndAssignments(
      versionId,
      [
        {
          title: "論点A",
          description: "desc",
          sort_order: 0,
          parent_sort_order: null,
        },
      ],
      [
        { opinion_segment_id: okIds[0], topic_index: 0 },
        { opinion_segment_id: pendingIds[0], topic_index: 0 },
        { opinion_segment_id: hiddenIds[0], topic_index: 0 },
      ]
    );
    await publishVersion(versionId);

    const data = await findPublishedAnalysis(configId);
    expect(data).not.toBeNull();
    if (!data) return;
    const result = buildPublicTopicAnalysis(data.meta, data.rawTopics);

    expect(result.interview_config_id).toBe(configId);
    expect(result.total_opinions).toBe(1);
    expect(result.topics).toHaveLength(1);
    expect(result.topics[0].opinion_count).toBe(1);
    expect(result.topics[0].opinions[0].title).toBe("ok");
    expect(result.topics[0].opinions[0].opinion_public).toBe(true);
  });
});
