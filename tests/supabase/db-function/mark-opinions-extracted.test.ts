import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestPolicy,
  cleanupTestUser,
  createTestInterviewData,
  createTestOpinion,
  createTestUser,
  type TestUser,
} from "../utils";
import { cleanupTestInterviewConfig } from "./helpers";

let user: TestUser;
let policyId: string;
let configId: string;
let opinionId: string;
const segmentIds: string[] = [];

async function insertSegment(index: number): Promise<string> {
  const { data, error } = await adminClient
    .from("opinion_segments")
    .insert({
      opinion_id: opinionId,
      opinion_index: index,
      title: `意見${index}`,
      content: `内容${index}`,
    })
    .select("id")
    .single();
  if (error) throw new Error(`opinion_segments 作成失敗: ${error.message}`);
  return data.id;
}

async function extractedAtById(): Promise<Map<string, string | null>> {
  const { data } = await adminClient
    .from("opinion_segments")
    .select("id, topic_extracted_at")
    .in("id", segmentIds);
  return new Map((data ?? []).map((r) => [r.id, r.topic_extracted_at]));
}

describe("mark_opinions_extracted()", () => {
  beforeAll(async () => {
    user = await createTestUser();
    const { policy, config, session } = await createTestInterviewData(user.id);
    policyId = policy.id;
    configId = config.id;
    opinionId = (await createTestOpinion(session.id)).id;
    segmentIds.push(await insertSegment(0));
    segmentIds.push(await insertSegment(1));
    segmentIds.push(await insertSegment(2));
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(configId);
    await cleanupTestPolicy(policyId);
    await cleanupTestUser(user.id);
  });

  it("指定した論点だけ topic_extracted_at を一括更新し、他は触らない", async () => {
    const at = "2026-06-16T00:00:00Z";
    const { error } = await adminClient.rpc("mark_opinions_extracted", {
      p_ids: [segmentIds[0], segmentIds[1]],
      p_extracted_at: at,
    });
    expect(error).toBeNull();

    const map = await extractedAtById();
    // 指定した2件は更新される
    expect(new Date(map.get(segmentIds[0]) ?? 0).getTime()).toBe(
      new Date(at).getTime()
    );
    expect(new Date(map.get(segmentIds[1]) ?? 0).getTime()).toBe(
      new Date(at).getTime()
    );
    // 指定していない1件は null のまま
    expect(map.get(segmentIds[2])).toBeNull();
  });

  it("空配列では何も更新しない", async () => {
    const { error } = await adminClient.rpc("mark_opinions_extracted", {
      p_ids: [],
      p_extracted_at: "2026-06-16T01:00:00Z",
    });
    expect(error).toBeNull();

    const map = await extractedAtById();
    // 3件目は依然 null（影響を受けない）
    expect(map.get(segmentIds[2])).toBeNull();
  });
});
