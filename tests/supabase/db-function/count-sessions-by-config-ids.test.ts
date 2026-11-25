import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestInterviewConfig,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestSession,
  createTestUser,
} from "../utils";

describe("count_sessions_by_config_ids", () => {
  let user: { id: string };
  let configId1: string;
  let configId2: string;
  let configIdEmpty: string;

  beforeAll(async () => {
    user = await createTestUser();

    // config1: セッション3件
    configId1 = (await createTestInterviewConfig({ status: "open" })).id;
    for (let i = 0; i < 3; i++) {
      await createTestSession(configId1, user.id);
    }

    // config2: セッション1件
    configId2 = (await createTestInterviewConfig({ status: "closed" })).id;
    await createTestSession(configId2, user.id);

    // configEmpty: セッション0件
    configIdEmpty = (await createTestInterviewConfig({ status: "draft" })).id;
  });

  afterAll(async () => {
    for (const configId of [configId1, configId2, configIdEmpty]) {
      await cleanupTestInterviewConfig(configId);
    }
    await cleanupTestUser(user.id);
  });

  it("複数の意見募集のセッション数を正しくカウントする", async () => {
    const { data, error } = await adminClient.rpc(
      "count_sessions_by_config_ids",
      { p_config_ids: [configId1, configId2] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(2);

    const map = new Map(
      (data ?? []).map((r) => [r.interview_config_id, r.session_count])
    );
    expect(map.get(configId1)).toBe(3);
    expect(map.get(configId2)).toBe(1);
  });

  it("セッションが0件のconfigは結果に含まれない", async () => {
    const { data, error } = await adminClient.rpc(
      "count_sessions_by_config_ids",
      { p_config_ids: [configIdEmpty] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("空配列を渡すと空の結果を返す", async () => {
    const { data, error } = await adminClient.rpc(
      "count_sessions_by_config_ids",
      { p_config_ids: [] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("存在しないconfig IDを渡すと空の結果を返す", async () => {
    const { data, error } = await adminClient.rpc(
      "count_sessions_by_config_ids",
      { p_config_ids: ["00000000-0000-0000-0000-000000000000"] }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
