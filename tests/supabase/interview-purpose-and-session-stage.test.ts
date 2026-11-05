import { afterEach, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestInterviewConfig,
  createTestInterviewConfig,
  createTestSession,
} from "./utils";

/**
 * 目的別テンプレートとサーバー側のターン制御の前提になるスキーマ。
 * 既存データのステージの埋め方は、マイグレーション前のデータを用意して手元で確認している（PR 本文を参照）。
 */
describe("意見募集の目的とセッションのステージ", () => {
  const createdConfigIds: string[] = [];

  afterEach(async () => {
    for (const id of createdConfigIds.splice(0)) {
      await cleanupTestInterviewConfig(id);
    }
  });

  async function createConfig(
    overrides: Parameters<typeof createTestInterviewConfig>[0] = {}
  ) {
    const config = await createTestInterviewConfig(overrides);
    createdConfigIds.push(config.id);
    return config;
  }

  it("目的・意見がほしい点・決まっていることは未設定（NULL）で作成できる", async () => {
    const config = await createConfig();

    expect(config.purpose_type).toBeNull();
    expect(config.opinion_focus).toBeNull();
    expect(config.decided_matters).toBeNull();
  });

  it("目的・意見がほしい点・決まっていることを保存できる", async () => {
    const config = await createConfig({
      purpose_type: "discover",
      opinion_focus: "支援の優先順位",
      decided_matters: "来年度から開始する",
    });

    expect(config.purpose_type).toBe("discover");
    expect(config.opinion_focus).toBe("支援の優先順位");
    expect(config.decided_matters).toBe("来年度から開始する");
  });

  it("新しいセッションは同意日時と一緒に作成でき、chat のステージで始まる", async () => {
    const config = await createConfig();
    const consentedAt = new Date().toISOString();

    const session = await createTestSession(config.id, null, {
      consented_at: consentedAt,
    });

    expect(session.stage).toBe("chat");
    expect(new Date(session.consented_at ?? "").toISOString()).toBe(
      consentedAt
    );
  });

  it("聞き手の人物像と初回の発話を版管理の対象に登録する", async () => {
    const { data, error } = await adminClient
      .from("ai_prompts")
      .select("key, name")
      .in("key", ["interview-persona", "interview-initial-system"])
      .order("key");
    if (error) throw error;

    expect(data).toEqual([
      { key: "interview-initial-system", name: "AIインタビュー・初回の発話" },
      { key: "interview-persona", name: "AIインタビュー・聞き手の人物像" },
    ]);
  });
});
