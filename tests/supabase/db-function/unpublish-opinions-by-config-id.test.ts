import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestUser,
  createTestOpinion,
  createTestSession,
  createTestUser,
  type TestUser,
} from "../utils";
import { trackInterviewConfigs } from "./helpers";

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
  const configs = trackInterviewConfigs();

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
    await configs.cleanup();
    await cleanupTestUser(user.id);
  });

  it("公開中の意見をhiddenにしis_public_by_adminを下げる", async () => {
    const configId = await configs.createConfigId();

    const published = await createOpinionInConfig(configId, {
      review_status: "published",
      is_public_by_admin: true,
      is_public_by_user: true,
    });

    const { error } = await adminClient.rpc("unpublish_opinions_by_config_id", {
      p_config_id: configId,
    });
    expect(error).toBeNull();

    const updated = await readOpinion(published.id);
    expect(updated.review_status).toBe("hidden");
    expect(updated.is_public_by_admin).toBe(false);
  });

  it("レビュー保留中の意見はhiddenにしない", async () => {
    const configId = await configs.createConfigId();

    // pending_review まで hidden にすると、テーマを開き直しても
    // bulk_publish_opinions（pending_review が条件）も本人操作による自動公開も
    // 効かなくなり、公開に同意済みの意見を二度と公開できなくなる。
    const pending = await createOpinionInConfig(configId, {
      review_status: "pending_review",
      is_public_by_user: true,
    });

    const { error } = await adminClient.rpc("unpublish_opinions_by_config_id", {
      p_config_id: configId,
    });
    expect(error).toBeNull();

    const after = await readOpinion(pending.id);
    expect(after.review_status).toBe("pending_review");
  });

  it("すでにhiddenの意見は更新対象にならない", async () => {
    const configId = await configs.createConfigId();

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
    const targetConfigId = await configs.createConfigId();
    const otherConfigId = await configs.createConfigId();

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
