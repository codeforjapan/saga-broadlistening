import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestInterviewConfig,
  createTestInterviewConfig,
} from "../utils";

/**
 * publish_theme_voice_summary の統合テスト。
 *
 * 検証観点:
 * - 下書きを公開すると published になり、published_at が入る
 * - 同じテーマで公開中だった版は archived になり、公開中は常に1件
 * - 別テーマの公開中の版には影響しない
 * - 存在しない ID はエラーになる
 * - 部分ユニーク制約により、RPC を通さず2件目を published にはできない
 */
describe("publish_theme_voice_summary", () => {
  let configId: string;
  let otherConfigId: string;

  async function insertSummary(
    interviewConfigId: string,
    status: "draft" | "published" | "archived" = "draft"
  ) {
    const { data, error } = await adminClient
      .from("theme_voice_summaries")
      .insert({
        interview_config_id: interviewConfigId,
        content_md: "# 問い\n\n本文",
        status,
        source_topic_count: 3,
        source_opinion_count: 40,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`まとめ作成失敗: ${error.message}`);
    return data.id;
  }

  async function statusOf(id: string) {
    const { data, error } = await adminClient
      .from("theme_voice_summaries")
      .select("status, published_at")
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async function publishedCount(interviewConfigId: string) {
    const { count, error } = await adminClient
      .from("theme_voice_summaries")
      .select("id", { count: "exact", head: true })
      .eq("interview_config_id", interviewConfigId)
      .eq("status", "published");
    if (error) throw new Error(error.message);
    return count;
  }

  beforeAll(async () => {
    configId = (await createTestInterviewConfig()).id;
    otherConfigId = (await createTestInterviewConfig()).id;
  });

  afterAll(async () => {
    // theme_voice_summaries は interview_configs の削除で cascade される
    await cleanupTestInterviewConfig(configId);
    await cleanupTestInterviewConfig(otherConfigId);
  });

  it("下書きを公開し、同じテーマの公開中の版を archived にする", async () => {
    const otherPublished = await insertSummary(otherConfigId, "published");
    const first = await insertSummary(configId);

    const firstResult = await adminClient.rpc("publish_theme_voice_summary", {
      p_summary_id: first,
    });
    expect(firstResult.error).toBeNull();
    const firstStatus = await statusOf(first);
    expect(firstStatus.status).toBe("published");
    expect(firstStatus.published_at).not.toBeNull();

    const second = await insertSummary(configId);
    const secondResult = await adminClient.rpc("publish_theme_voice_summary", {
      p_summary_id: second,
    });
    expect(secondResult.error).toBeNull();

    expect((await statusOf(first)).status).toBe("archived");
    expect((await statusOf(second)).status).toBe("published");
    expect(await publishedCount(configId)).toBe(1);
    // 別テーマの公開中の版はそのまま
    expect((await statusOf(otherPublished)).status).toBe("published");
  });

  it("公開中の版を再公開しても公開中のまま1件で、更新日は変わらない", async () => {
    const id = await insertSummary(configId);
    await adminClient.rpc("publish_theme_voice_summary", { p_summary_id: id });
    const before = await statusOf(id);
    const { error } = await adminClient.rpc("publish_theme_voice_summary", {
      p_summary_id: id,
    });
    expect(error).toBeNull();
    const after = await statusOf(id);
    expect(after.status).toBe("published");
    expect(after.published_at).toBe(before.published_at);
    expect(await publishedCount(configId)).toBe(1);
  });

  it("存在しない ID はエラーになる", async () => {
    const { error } = await adminClient.rpc("publish_theme_voice_summary", {
      p_summary_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error?.message).toContain("not found");
  });

  it("RPC を通さずに同じテーマで2件目を published にはできない", async () => {
    // 他のテストの状態に依存しないよう、専用のテーマで1件目を公開しておく
    const isolatedConfigId = (await createTestInterviewConfig()).id;
    try {
      await insertSummary(isolatedConfigId, "published");
      await expect(
        insertSummary(isolatedConfigId, "published")
      ).rejects.toThrow("theme_voice_summaries_one_published");
    } finally {
      await cleanupTestInterviewConfig(isolatedConfigId);
    }
  });
});
