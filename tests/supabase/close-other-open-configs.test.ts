import { afterEach, describe, expect, it } from "vitest";
import { closeOtherOpenConfigs } from "../../admin/src/features/interview-config/server/repositories/interview-config-repository";
import {
  adminClient,
  cleanupTestInterviewConfig,
  cleanupTestPolicy,
  createTestInterviewConfig,
  createTestPolicy,
  linkPolicyToInterviewConfig,
} from "./utils";

/**
 * 施策 ↔ 意見募集は policies_interview_configs による多対多になったため、
 * 「同じ施策の他の募集中テーマを閉じる」は中間テーブルを辿って決まる。
 * PostgREST 越しの絞り込みと `status = 'open'` を条件にした更新を実挙動で確かめる。
 */
describe("closeOtherOpenConfigs", () => {
  const createdPolicyIds: string[] = [];
  const createdConfigIds: string[] = [];

  afterEach(async () => {
    for (const id of createdConfigIds.splice(0)) {
      await cleanupTestInterviewConfig(id);
    }
    for (const id of createdPolicyIds.splice(0)) {
      await cleanupTestPolicy(id);
    }
  });

  async function createPolicy() {
    const policy = await createTestPolicy();
    createdPolicyIds.push(policy.id);
    return policy;
  }

  /** 施策に紐づけた意見募集を1件作る。 */
  async function createLinkedConfig(
    policyId: string,
    status: "open" | "closed",
    name: string
  ) {
    const config = await createTestInterviewConfig({ status, name });
    createdConfigIds.push(config.id);
    await linkPolicyToInterviewConfig(policyId, config.id);
    return config;
  }

  async function readConfig(configId: string) {
    const { data, error } = await adminClient
      .from("interview_configs")
      .select("status, updated_at")
      .eq("id", configId)
      .single();
    if (error) throw new Error(`interview_config 取得失敗: ${error.message}`);
    return data;
  }

  it("excludeなしで呼ぶと、対象施策の募集中configはclosedになる", async () => {
    const policy = await createPolicy();
    const config = await createLinkedConfig(policy.id, "open", "募集中テーマ");

    await closeOtherOpenConfigs([policy.id]);

    expect((await readConfig(config.id)).status).toBe("closed");
  });

  it("既にclosedなconfigのupdated_atは変化しない", async () => {
    const policy = await createPolicy();
    const config = await createLinkedConfig(policy.id, "closed", "終了テーマ");
    const originalUpdatedAt = config.updated_at;

    // UPDATE BEFORE トリガでupdated_atが上書きされないことを確認するため、
    // 時刻が進んだ状態で呼び出す
    await new Promise((r) => setTimeout(r, 50));
    await closeOtherOpenConfigs([policy.id]);

    expect((await readConfig(config.id)).updated_at).toBe(originalUpdatedAt);
  });

  it("別施策の募集中configは影響を受けない", async () => {
    const policyA = await createPolicy();
    const policyB = await createPolicy();
    const configA = await createLinkedConfig(
      policyA.id,
      "open",
      "施策Aのテーマ"
    );
    const configB = await createLinkedConfig(
      policyB.id,
      "open",
      "施策Bのテーマ"
    );

    await closeOtherOpenConfigs([policyA.id]);

    expect((await readConfig(configA.id)).status).toBe("closed");
    expect((await readConfig(configB.id)).status).toBe("open");
  });

  it("excludeConfigIdを渡すと、該当configは除外される", async () => {
    const policy = await createPolicy();
    const kept = await createLinkedConfig(policy.id, "open", "残すテーマ");
    const closed = await createLinkedConfig(policy.id, "open", "閉じるテーマ");

    await closeOtherOpenConfigs([policy.id], kept.id);

    expect((await readConfig(kept.id)).status).toBe("open");
    expect((await readConfig(closed.id)).status).toBe("closed");
  });

  it("対象のconfigが存在しなくてもエラーにならない", async () => {
    const policy = await createPolicy();

    await expect(closeOtherOpenConfigs([policy.id])).resolves.toBeUndefined();
  });
});
