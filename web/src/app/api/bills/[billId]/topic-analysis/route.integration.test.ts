import {
  buildPublicTopicAnalysis,
  findPublishedAnalysis,
} from "@mirai-gikai/topic-analysis-core/public-server";
import {
  adminClient,
  cleanupTestUser,
  createTestOpinionWithSegments,
  createTestPolicyWithConfig,
  createTestUser,
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
  const { segmentIds } = await createTestOpinionWithSegments({
    interviewConfigId: opts.configId,
    userId: opts.userId,
    session: { completed_at: new Date().toISOString() },
    opinion: {
      review_status: opts.reviewStatus,
      is_public_by_user: opts.reviewStatus === "published",
      is_public_by_admin: opts.reviewStatus === "published",
      moderation_score: opts.moderationScore,
      summary: "s",
    },
    segments: [{ title: opts.title, content: "c" }],
  });
  return segmentIds[0];
}

describe("公開トピック分析 読み取り（web 統合）", () => {
  let testUser: TestUser;
  let billId: string;
  let publishedBillId: string;
  let publishedConfigId: string;
  let emptyConfigId: string;
  const cleanups: Array<() => Promise<void>> = [];

  beforeAll(async () => {
    testUser = await createTestUser();

    // 公開版あり: topic に「公開」「非公開」の2意見を割当
    const published = await createTestPolicyWithConfig({
      config: { name: "uta-read-test" },
    });
    publishedBillId = published.policy.id;
    publishedConfigId = published.config.id;
    cleanups.push(published.cleanup);

    const okId = await createOpinionSegment({
      configId: publishedConfigId,
      userId: testUser.id,
      reviewStatus: "published",
      moderationScore: 5,
      title: "公開OK",
    });
    const privateId = await createOpinionSegment({
      configId: publishedConfigId,
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
    const empty = await createTestPolicyWithConfig();
    billId = empty.policy.id;
    emptyConfigId = empty.config.id;
    cleanups.push(empty.cleanup);
  });

  afterAll(async () => {
    // beforeAll が途中で失敗しても、そこまでに作った分だけ後片付けする。
    for (const cleanup of cleanups.splice(0)) {
      await cleanup();
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
