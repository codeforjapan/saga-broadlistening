import { afterEach, describe, expect, it } from "vitest";
import { adminClient, cleanupTestPolicy, createTestPolicy } from "../utils";

describe("update_updated_at_column トリガー", () => {
  let policyId: string | undefined;

  afterEach(async () => {
    if (policyId) {
      await cleanupTestPolicy(policyId);
      policyId = undefined;
    }
  });

  it("UPDATE 時に updated_at が自動で更新される", async () => {
    const policy = await createTestPolicy();
    policyId = policy.id;
    const originalUpdatedAt = policy.updated_at;

    // 少し待ってから更新（タイムスタンプの差を確実にする）
    await new Promise((r) => setTimeout(r, 100));

    const { error } = await adminClient
      .from("policies")
      .update({ name: "更新後の施策名" })
      .eq("id", policy.id);
    expect(error).toBeNull();

    const { data: updated } = await adminClient
      .from("policies")
      .select("updated_at")
      .eq("id", policy.id)
      .single();

    expect(updated).not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: expect で null チェック済み
    expect(new Date(updated!.updated_at).getTime()).toBeGreaterThan(
      new Date(originalUpdatedAt).getTime()
    );
  });

  it("INSERT 時に updated_at にデフォルト値が設定される", async () => {
    const before = new Date();
    const policy = await createTestPolicy();
    policyId = policy.id;
    const after = new Date();

    const updatedAt = new Date(policy.updated_at).getTime();
    expect(updatedAt).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(updatedAt).toBeLessThanOrEqual(after.getTime() + 1000);
  });
});
