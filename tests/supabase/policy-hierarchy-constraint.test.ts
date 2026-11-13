import { afterEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestPolicy,
  createTestPolicy,
  type TestPolicyOverrides,
} from "./utils";

/**
 * policies の親子関係・関連リンクの制約（Epic #162 / #154）。
 * 1階層のルール（孫を許さない）はアプリ層で検証し、DB は自己参照と
 * related_links が配列であることだけを守る。
 */
describe("policies の親子関係・関連リンクの制約", () => {
  const created: string[] = [];

  afterEach(async () => {
    // 親を消しても子は on delete set null で残るため、削除の順序は問わない
    await Promise.all(created.splice(0).map(cleanupTestPolicy));
  });

  async function newPolicy(overrides: TestPolicyOverrides = {}) {
    const policy = await createTestPolicy(overrides);
    created.push(policy.id);
    return policy;
  }

  it("新しい列は既定値（親なし・並び順0・関連リンク空）で作られる", async () => {
    const policy = await newPolicy();
    expect(policy.parent_policy_id).toBeNull();
    expect(policy.sort_order).toBe(0);
    expect(policy.related_links).toEqual([]);
  });

  it("自分自身を親にする更新は拒否される", async () => {
    const policy = await newPolicy();
    const { error } = await adminClient
      .from("policies")
      .update({ parent_policy_id: policy.id })
      .eq("id", policy.id);
    expect(error?.code).toBe("23514");
  });

  it("親を削除すると子の parent_policy_id は null になる", async () => {
    const parent = await newPolicy();
    const child = await newPolicy({ parent_policy_id: parent.id });

    await cleanupTestPolicy(parent.id);

    const { data } = await adminClient
      .from("policies")
      .select("parent_policy_id")
      .eq("id", child.id)
      .single();
    expect(data?.parent_policy_id).toBeNull();
  });

  it("related_links に配列以外は保存できない", async () => {
    const policy = await newPolicy();
    const { error } = await adminClient
      .from("policies")
      .update({ related_links: { label: "x" } })
      .eq("id", policy.id);
    expect(error?.code).toBe("23514");
  });
});
