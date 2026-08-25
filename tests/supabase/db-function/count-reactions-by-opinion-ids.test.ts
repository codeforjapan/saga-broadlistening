import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestInterviewConfig,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestOpinion,
  createTestSession,
  createTestUser,
  type TestUser,
} from "../utils";
import { createTestReactions } from "./helpers";

const MISSING_ID = "00000000-0000-0000-0000-000000000000";

describe("count_reactions_by_opinion_ids() 関数", () => {
  const users: TestUser[] = [];
  let configId: string;
  // opinion1: helpful x2 / hmm x1、opinion2: helpful x1、opinion3: リアクションなし
  let opinionId1: string;
  let opinionId2: string;
  let opinionId3: string;

  beforeAll(async () => {
    for (let i = 0; i < 3; i++) {
      users.push(await createTestUser());
    }
    const config = await createTestInterviewConfig();
    configId = config.id;

    const session1 = await createTestSession(configId, users[0].id);
    const session2 = await createTestSession(configId, users[1].id);
    const session3 = await createTestSession(configId, users[2].id);
    opinionId1 = (await createTestOpinion(session1.id)).id;
    opinionId2 = (await createTestOpinion(session2.id)).id;
    opinionId3 = (await createTestOpinion(session3.id)).id;

    await createTestReactions(opinionId1, [users[0].id], "helpful");
    await createTestReactions(opinionId1, [users[1].id], "helpful");
    await createTestReactions(opinionId1, [users[2].id], "hmm");
    await createTestReactions(opinionId2, [users[0].id], "helpful");
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(configId);
    for (const user of users) {
      await cleanupTestUser(user.id);
    }
  });

  it("複数の意見のリアクション数を種別ごとに集約して返す", async () => {
    const { data, error } = await adminClient.rpc(
      "count_reactions_by_opinion_ids",
      { opinion_ids: [opinionId1, opinionId2] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(3);

    const counts = new Map(
      data?.map((row) => [`${row.opinion_id}:${row.reaction_type}`, row.cnt])
    );
    expect(counts.get(`${opinionId1}:helpful`)).toBe(2);
    expect(counts.get(`${opinionId1}:hmm`)).toBe(1);
    expect(counts.get(`${opinionId2}:helpful`)).toBe(1);
    // 付いていない種別は行そのものが返らない
    expect(counts.has(`${opinionId2}:hmm`)).toBe(false);
  });

  it("リアクションが1件もない意見は結果に含まれない", async () => {
    const { data, error } = await adminClient.rpc(
      "count_reactions_by_opinion_ids",
      { opinion_ids: [opinionId3] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("存在しないIDが混ざっていても該当する意見の分だけ返す", async () => {
    const { data, error } = await adminClient.rpc(
      "count_reactions_by_opinion_ids",
      { opinion_ids: [opinionId2, MISSING_ID] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].opinion_id).toBe(opinionId2);
    expect(data?.[0].reaction_type).toBe("helpful");
    expect(data?.[0].cnt).toBe(1);
  });

  it("空配列を渡すと空の結果を返す", async () => {
    const { data, error } = await adminClient.rpc(
      "count_reactions_by_opinion_ids",
      { opinion_ids: [] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
