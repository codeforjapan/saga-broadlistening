import { afterEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestInterviewConfig,
  createTestInterviewConfig,
} from "./utils";

/**
 * interview_configs_external_identity_requires_providers（CHECK 制約）
 * external_identity のテーマは許可する連携元を1件以上持たなければならない。
 * admin の zod refine と同じ不変条件を DB 側でも守る。
 */
describe("interview_configs の参加条件 CHECK 制約", () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(cleanupTestInterviewConfig));
  });

  it("external_identity で連携元が空の行は拒否される", async () => {
    const { error } = await adminClient.from("interview_configs").insert({
      name: "制約テスト",
      slug: `constraint-${Date.now()}`,
      chat_model: "test-model",
      participation_mode: "external_identity",
      allowed_provider_keys: [],
    });
    expect(error?.code).toBe("23514");
  });

  it("external_identity で連携元があれば作成でき、public は連携元なしでよい", async () => {
    const external = await createTestInterviewConfig({
      participation_mode: "external_identity",
      allowed_provider_keys: ["saga_super_app"],
    });
    created.push(external.id);
    expect(external.participation_mode).toBe("external_identity");

    const pub = await createTestInterviewConfig();
    created.push(pub.id);
    expect(pub.participation_mode).toBe("public");
    expect(pub.allowed_provider_keys).toEqual([]);
  });
});
