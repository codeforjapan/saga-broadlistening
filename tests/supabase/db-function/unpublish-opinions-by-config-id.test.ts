import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestOpinion,
  createTestUser,
  type TestUser,
} from "../utils";
import { cleanupTestInterviewConfig, createTestSession } from "./helpers";

async function readOpinion(opinionId: string) {
  const { data, error } = await adminClient
    .from("opinions")
    .select("review_status, is_public_by_admin, updated_at")
    .eq("id", opinionId)
    .single();
  if (error) throw new Error(`opinions 取得失敗: ${error.message}`);
  return data;
}

describe("unpublish_opinions_by_config_id", () => {
  let user: TestUser;
  const configIds: string[] = [];

  async function createConfig(): Promise<string> {
    const config = await createTestInterviewConfig();
    configIds.push(config.id);
    return config.id;
  }

  async function createOpinionInConfig(
    configId: string,
    overrides: Partial<{
      review_status: "published" | "pending_review" | "hidden";
      is_public_by_admin: boolean;
      is_public_by_user: boolean;
    }>
  ) {
    const session = await createTestSession(configId, user.id);
    return await createTestOpinion(session.id, overrides);
  }

  beforeEach(async () => {
    user = await createTestUser();
  });

  afterEach(async () => {
    for (const configId of configIds) {
      await cleanupTestInterviewConfig(configId);
    }
    configIds.length = 0;
    await cleanupTestUser(user.id);
  });

  it("対象config配下の意見をhiddenにしis_public_by_adminを下げる", async () => {
    const configId = await createConfig();

    const published = await createOpinionInConfig(configId, {
      review_status: "published",
      is_public_by_admin: true,
      is_public_by_user: true,
    });
    // レビュー保留中でも、職員の判断としてまとめて hidden にする
    const pending = await createOpinionInConfig(configId, {
      review_status: "pending_review",
      is_public_by_user: true,
    });

    const { error } = await adminClient.rpc("unpublish_opinions_by_config_id", {
      p_config_id: configId,
    });
    expect(error).toBeNull();

    for (const opinionId of [published.id, pending.id]) {
      const updated = await readOpinion(opinionId);
      expect(updated.review_status).toBe("hidden");
      expect(updated.is_public_by_admin).toBe(false);
    }
  });

  it("すでにhiddenの意見は更新対象にならない", async () => {
    const configId = await createConfig();

    const alreadyHidden = await createOpinionInConfig(configId, {
      review_status: "hidden",
    });
    const before = await readOpinion(alreadyHidden.id);

    const { error } = await adminClient.rpc("unpublish_opinions_by_config_id", {
      p_config_id: configId,
    });
    expect(error).toBeNull();

    const after = await readOpinion(alreadyHidden.id);
    expect(after.review_status).toBe("hidden");
    expect(after.is_public_by_admin).toBe(false);
    // 対象外なので updated_at も動かない
    expect(after.updated_at).toBe(before.updated_at);
  });

  it("別configの意見には影響しない", async () => {
    const targetConfigId = await createConfig();
    const otherConfigId = await createConfig();

    await createOpinionInConfig(targetConfigId, {
      review_status: "published",
      is_public_by_admin: true,
    });
    const otherOpinion = await createOpinionInConfig(otherConfigId, {
      review_status: "published",
      is_public_by_admin: true,
    });

    const { error } = await adminClient.rpc("unpublish_opinions_by_config_id", {
      p_config_id: targetConfigId,
    });
    expect(error).toBeNull();

    const untouched = await readOpinion(otherOpinion.id);
    expect(untouched.review_status).toBe("published");
    expect(untouched.is_public_by_admin).toBe(true);
  });

  it("存在しないconfig IDを渡してもエラーにならない（no-op）", async () => {
    const { error } = await adminClient.rpc("unpublish_opinions_by_config_id", {
      p_config_id: "00000000-0000-0000-0000-000000000000",
    });

    expect(error).toBeNull();
  });
});
