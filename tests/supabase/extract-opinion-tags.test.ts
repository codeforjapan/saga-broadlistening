import {
  findOpinionsToTag,
  findUntaggedOpinionSegments,
} from "@mirai-gikai/topic-analysis-core/repository";
import { extractOpinionTagsForReport } from "@mirai-gikai/topic-analysis-core/tag-backfill-service";
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
 * タグ付けサービスの統合テスト（LLM だけ Fake に差し替える）。
 *
 * 「タグは書くが、返ってこなかった論点はウォーターマークだけ進める」
 * 「1件も返らなければ failed として集計に出す」を回帰検知する。
 */

async function createOpinionWithSegments(opts: {
  configId: string;
  userId: string;
  segmentCount: number;
  withMessages: boolean;
}) {
  return await createTestOpinionWithSegments({
    interviewConfigId: opts.configId,
    userId: opts.userId,
    session: { completed_at: "2024-07-01T00:00:00Z" },
    opinion: {
      is_public_by_user: true,
      summary: "サマリ",
      role_title: "教員",
    },
    messages: opts.withMessages
      ? [
          {
            role: "assistant",
            content: JSON.stringify({ text: "どう思いますか？" }),
          },
          { role: "user", content: "現場では紙のほうが定着すると感じます" },
        ]
      : [],
    segments: Array.from({ length: opts.segmentCount }, () => ({})),
  });
}

async function readSegments(opinionId: string) {
  const { data } = await adminClient
    .from("opinion_segments")
    .select("opinion_index, concern, reasoning_types, tags_extracted_at")
    .eq("opinion_id", opinionId)
    .order("opinion_index");
  return data ?? [];
}

describe("extractOpinionTagsForReport 統合テスト", () => {
  let testUser: TestUser;
  let configId: string;

  beforeAll(async () => {
    testUser = await createTestUser();
    configId = (await createTestInterviewConfig({ name: "tag-service-test" }))
      .id;
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(configId);
    await cleanupTestUser(testUser.id);
  });

  it("返ってきた論点にはタグを書き、返らなかった論点はウォーターマークだけ進める", async () => {
    const { opinionId, sessionId } = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      segmentCount: 2,
      withMessages: true,
    });

    const result = await extractOpinionTagsForReport(
      { opinionId, sessionId, roleTitle: "教員" },
      {
        // index 0 だけ返し、index 1 は返さない
        generateTags: async () => ({
          tags: [
            {
              opinion_index: 0,
              concern: "健康影響が心配",
              proposal: null,
              reasoning_types: ["professional_expertise" as const],
            },
          ],
        }),
      }
    );

    expect(result.status).toBe("updated");
    expect(result.tagged).toBe(1);

    const segments = await readSegments(opinionId);
    expect(segments[0].concern).toBe("健康影響が心配");
    expect(segments[0].reasoning_types).toEqual(["professional_expertise"]);
    expect(segments[0].tags_extracted_at).not.toBeNull();

    // 返ってこなかった論点: タグは空のまま、ウォーターマークだけ進む
    expect(segments[1].concern).toBeNull();
    expect(segments[1].reasoning_types).toEqual([]);
    expect(segments[1].tags_extracted_at).not.toBeNull();

    // 二度と対象にならない
    expect(await findUntaggedOpinionSegments(opinionId)).toEqual([]);
  });

  // 全件空振りを updated として集計すると「正常完了」に見えてしまう。
  it("1件もタグが返らなければ failed になる", async () => {
    const { opinionId, sessionId } = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      segmentCount: 1,
      withMessages: true,
    });

    const result = await extractOpinionTagsForReport(
      { opinionId, sessionId, roleTitle: null },
      { generateTags: async () => ({ tags: [] }) }
    );

    expect(result.status).toBe("failed");
    expect(result.tagged).toBe(0);
  });

  // 発言原文が無いと professional_expertise の判定材料が無い。
  it("会話ログが無い意見は skip する", async () => {
    const { opinionId, sessionId } = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      segmentCount: 1,
      withMessages: false,
    });

    let called = false;
    const result = await extractOpinionTagsForReport(
      { opinionId, sessionId, roleTitle: null },
      {
        generateTags: async () => {
          called = true;
          return { tags: [] };
        },
      }
    );

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("no chat messages");
    expect(called).toBe(false);
    // 滞留しないようウォーターマークは進む
    expect(await findUntaggedOpinionSegments(opinionId)).toEqual([]);
  });

  it("タグ付け済みの意見は対象抽出に出てこない", async () => {
    const { opinionId, sessionId } = await createOpinionWithSegments({
      configId,
      userId: testUser.id,
      segmentCount: 1,
      withMessages: true,
    });
    await extractOpinionTagsForReport(
      { opinionId, sessionId, roleTitle: null },
      {
        generateTags: async () => ({
          tags: [
            {
              opinion_index: 0,
              concern: null,
              proposal: null,
              reasoning_types: ["none" as const],
            },
          ],
        }),
      }
    );

    const remaining = await findOpinionsToTag(50, configId);
    expect(remaining.map((o) => o.opinionId)).not.toContain(opinionId);
  });
});
