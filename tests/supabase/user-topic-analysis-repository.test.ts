import {
  createVersion,
  fetchTargetOpinions,
  getTopicsWithOpinions,
  saveTopicsAndAssignments,
  updateVersionStatus,
} from "@mirai-gikai/topic-analysis-core/repository";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestInterviewConfig,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestOpinionWithSegments,
  createTestUser,
  type TestOpinionSegmentInput,
  type TestUser,
} from "./utils";

/** createVersion は競合時 null を返すため、テストでは非 null を強制する。 */
function expectVersion<T>(v: T | null): T {
  if (!v) throw new Error("createVersion unexpectedly returned null");
  return v;
}

/** §8 フィルタの入力になる意見を、公開状態とモデレーションスコアを指定して作る。 */
async function createOpinionWithSegments(opts: {
  configId: string;
  userId: string;
  reviewStatus: "published" | "pending_review" | "hidden";
  moderationScore: number; // <30=ok, 30-69=warning, >=70=ng（generated column）
  segments: TestOpinionSegmentInput[];
}) {
  return await createTestOpinionWithSegments({
    interviewConfigId: opts.configId,
    userId: opts.userId,
    session: { completed_at: new Date().toISOString() },
    opinion: {
      review_status: opts.reviewStatus,
      is_public_by_user: true,
      is_public_by_admin: opts.reviewStatus === "published",
      moderation_score: opts.moderationScore,
      summary: "s",
    },
    segments: opts.segments,
  });
}

describe("user-topic-analysis repository 統合テスト", () => {
  let testUser: TestUser;
  let configId: string;

  function newVersion() {
    return createVersion({
      interviewConfigId: configId,
      trigger: "manual",
      model: "test-model",
      promptVersion: "v1",
    });
  }

  beforeAll(async () => {
    testUser = await createTestUser();
    configId = (await createTestInterviewConfig({ name: "uta-test" })).id;
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(configId);
    await cleanupTestUser(testUser.id);
  });

  // one_active_version_per_interview_config によりテーマ内 active は1版まで。
  // テスト間で active を残すと次の createVersion が弾かれるため終端させる。
  afterEach(async () => {
    await adminClient
      .from("topic_analysis_version")
      .update({ status: "failed" })
      .eq("interview_config_id", configId)
      .in("status", ["pending", "running"]);
  });

  it("fetchTargetOpinions は公開済み×モデレーションOKの論点だけ返す（§8）", async () => {
    // A: 公開済み × ok（含まれる）
    const a = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      reviewStatus: "published",
      moderationScore: 5,
      segments: [
        { title: "A1", content: "期待" },
        { title: "A2", content: "懸念" },
      ],
    });
    // B: レビュー保留中（除外）
    await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      reviewStatus: "pending_review",
      moderationScore: 5,
      segments: [{ title: "B1", content: "x" }],
    });
    // C: 公開済み だが moderation ng（除外）
    await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      reviewStatus: "published",
      moderationScore: 80,
      segments: [{ title: "C1", content: "y" }],
    });
    // D: 職員が非公開にした（除外）
    await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      reviewStatus: "hidden",
      moderationScore: 5,
      segments: [{ title: "D1", content: "z" }],
    });

    const result = await fetchTargetOpinions(configId);
    const ids = result.map((r) => r.opinion_segment_id).sort();
    expect(ids).toEqual([...a.segmentIds].sort());
    expect(result.every((r) => r.opinion_id === a.opinionId)).toBe(true);
  });

  it("createVersion はテーマ内で連番を振る", async () => {
    const v1 = expectVersion(await newVersion());
    // active は1版までなので、次を作る前に v1 を終端させる。
    await updateVersionStatus(v1.id, "completed");
    const v2 = expectVersion(await newVersion());
    expect(v2.version).toBe(v1.version + 1);
  });

  it("createVersion は active な version が既にあれば null を返す（二重起動ガード）", async () => {
    const first = expectVersion(await newVersion());
    const second = await newVersion();
    expect(second).toBeNull();
    // first はまだ pending のまま（afterEach で終端される）
    expect(first.status).toBe("pending");
  });

  it("saveTopicsAndAssignments がトピックと割当を保存し、件数降順で取得できる", async () => {
    const { segmentIds } = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      reviewStatus: "published",
      moderationScore: 5,
      segments: [
        { title: "o1", content: "1" },
        { title: "o2", content: "2" },
        { title: "o3", content: "3" },
      ],
    });
    const version = expectVersion(await newVersion());

    // topic0 に 2件、topic1 に 1件
    await saveTopicsAndAssignments(
      version.id,
      [
        {
          title: "多い論点",
          description: "d0",
          sort_order: 0,
          parent_sort_order: null,
        },
        {
          title: "少ない論点",
          description: "d1",
          sort_order: 1,
          parent_sort_order: null,
        },
      ],
      [
        { opinion_segment_id: segmentIds[0], topic_index: 0 },
        { opinion_segment_id: segmentIds[1], topic_index: 0 },
        { opinion_segment_id: segmentIds[2], topic_index: 1 },
      ]
    );

    const topics = await getTopicsWithOpinions(version.id);
    expect(topics.map((t) => t.title)).toEqual(["多い論点", "少ない論点"]);
    expect(topics[0].topic_opinion).toHaveLength(2);
    expect(topics[1].topic_opinion).toHaveLength(1);
  });

  it("topic_opinion の PK で1論点が同一versionで複数トピックに付かない", async () => {
    const { segmentIds } = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      reviewStatus: "published",
      moderationScore: 5,
      segments: [{ title: "dup", content: "d" }],
    });
    const version = expectVersion(await newVersion());
    const { data: topics } = await adminClient
      .from("topic")
      .insert([
        {
          version_id: version.id,
          title: "t0",
          description: "d",
          sort_order: 0,
        },
        {
          version_id: version.id,
          title: "t1",
          description: "d",
          sort_order: 1,
        },
      ])
      .select("id");
    if (!topics) throw new Error("topics insert failed");

    await adminClient.from("topic_opinion").insert({
      version_id: version.id,
      opinion_segment_id: segmentIds[0],
      topic_id: topics[0].id,
    });
    // 同一 (version_id, opinion_segment_id) で別 topic → PK 違反
    const { error } = await adminClient.from("topic_opinion").insert({
      version_id: version.id,
      opinion_segment_id: segmentIds[0],
      topic_id: topics[1].id,
    });
    expect(error).not.toBeNull();
  });
});
