import {
  buildPublicTopicAnalysis,
  findPublishedAnalysis,
} from "@mirai-gikai/topic-analysis-core/public-server";
import {
  adminClient,
  cleanupTestPolicy,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestOpinion,
  createTestPolicy,
  createTestUser,
  linkPolicyToInterviewConfig,
  type TestUser,
} from "@test-utils/utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET } from "./route";

/** opinion + opinion_segment を1件作り、opinion_segment の id を返す。 */
async function createOpinionSegment(opts: {
  configId: string;
  userId: string;
  reviewStatus: "published" | "pending_review" | "hidden";
  moderationScore: number;
  title: string;
}): Promise<string> {
  const { data: session } = await adminClient
    .from("interview_sessions")
    .insert({
      interview_config_id: opts.configId,
      user_id: opts.userId,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (!session) throw new Error("session insert failed");

  const opinion = await createTestOpinion(session.id, {
    review_status: opts.reviewStatus,
    is_public_by_user: opts.reviewStatus === "published",
    is_public_by_admin: opts.reviewStatus === "published",
    moderation_score: opts.moderationScore,
    summary: "s",
  });

  const { data: segment } = await adminClient
    .from("opinion_segments")
    .insert({
      opinion_id: opinion.id,
      opinion_index: 0,
      title: opts.title,
      content: "c",
    })
    .select("id")
    .single();
  if (!segment) throw new Error("opinion_segment insert failed");
  return segment.id;
}

describe("公開トピック分析 読み取り（web 統合）", () => {
  let testUser: TestUser;
  let billId: string;
  let publishedBillId: string;
  let publishedConfigId: string;
  let emptyConfigId: string;

  beforeAll(async () => {
    testUser = await createTestUser();

    // 公開版あり: topic に「公開」「非公開」の2意見を割当
    const policy = await createTestPolicy();
    publishedBillId = policy.id;
    const config = await createTestInterviewConfig({ name: "uta-read-test" });
    publishedConfigId = config.id;
    await linkPolicyToInterviewConfig(publishedBillId, publishedConfigId);

    const okId = await createOpinionSegment({
      configId: config.id,
      userId: testUser.id,
      reviewStatus: "published",
      moderationScore: 5,
      title: "公開OK",
    });
    const privateId = await createOpinionSegment({
      configId: config.id,
      userId: testUser.id,
      reviewStatus: "pending_review",
      moderationScore: 5,
      title: "非公開",
    });

    const { data: version } = await adminClient
      .from("topic_analysis_version")
      .insert({
        interview_config_id: publishedConfigId,
        version: 1,
        status: "completed",
        trigger: "manual",
        is_published: true,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (!version) throw new Error("version insert failed");

    const { data: topic } = await adminClient
      .from("topic")
      .insert({
        version_id: version.id,
        title: "論点A",
        description: "desc",
        sort_order: 0,
      })
      .select()
      .single();
    if (!topic) throw new Error("topic insert failed");

    await adminClient.from("topic_opinion").insert([
      {
        version_id: version.id,
        topic_id: topic.id,
        opinion_segment_id: okId,
      },
      {
        version_id: version.id,
        topic_id: topic.id,
        opinion_segment_id: privateId,
      },
    ]);

    // 公開版なしの施策
    const policy2 = await createTestPolicy();
    billId = policy2.id;
    const emptyConfig = await createTestInterviewConfig();
    emptyConfigId = emptyConfig.id;
    await linkPolicyToInterviewConfig(billId, emptyConfigId);
  });

  afterAll(async () => {
    // beforeAll が途中失敗した場合に未初期化値で二次エラーを起こし、
    // 元の失敗原因を隠さないよう存在チェックしてからクリーンアップする。
    if (publishedBillId) await cleanupTestPolicy(publishedBillId);
    if (billId) await cleanupTestPolicy(billId);
    for (const configId of [publishedConfigId, emptyConfigId]) {
      if (configId) {
        await adminClient.from("interview_configs").delete().eq("id", configId);
      }
    }
    if (testUser?.id) await cleanupTestUser(testUser.id);
  });

  it("findPublishedAnalysis + buildPublicTopicAnalysis が §8 フィルタ後を返す", async () => {
    const data = await findPublishedAnalysis(publishedConfigId);
    expect(data).not.toBeNull();
    if (!data) return;
    const result = buildPublicTopicAnalysis(data.meta, data.rawTopics);
    expect(result.total_opinions).toBe(1);
    expect(result.topics).toHaveLength(1);
    expect(result.topics[0].opinions[0].title).toBe("公開OK");
  });

  it("公開版が無ければ null", async () => {
    expect(await findPublishedAnalysis(emptyConfigId)).toBeNull();
  });

  it("GET は公開版を 200 で返す", async () => {
    const res = await GET(
      new Request("http://localhost/api/bills/x/topic-analysis"),
      { params: Promise.resolve({ billId: publishedBillId }) }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total_opinions: number };
    expect(body.total_opinions).toBe(1);
  });

  it("GET は公開版が無ければ 404", async () => {
    const res = await GET(
      new Request("http://localhost/api/bills/x/topic-analysis"),
      { params: Promise.resolve({ billId }) }
    );
    expect(res.status).toBe(404);
  });
});
