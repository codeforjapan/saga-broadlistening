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

async function findOpenData(params: {
  minPublicOpinions?: number;
  limit?: number;
  cursorCreatedAt?: string;
  cursorId?: string;
}) {
  const { data, error } = await adminClient.rpc("find_open_data_opinions", {
    p_min_public_opinions: params.minPublicOpinions ?? 1,
    p_limit: params.limit ?? 100,
    ...(params.cursorCreatedAt
      ? { p_cursor_created_at: params.cursorCreatedAt }
      : {}),
    ...(params.cursorId ? { p_cursor_id: params.cursorId } : {}),
  });
  if (error) throw new Error(`find_open_data_opinions 失敗: ${error.message}`);
  return data ?? [];
}

describe("find_open_data_opinions", () => {
  let testUser: TestUser;
  const configIds: string[] = [];

  async function createConfig(status: "draft" | "open" | "closed" = "open") {
    const config = await createTestInterviewConfig({ status });
    configIds.push(config.id);
    return config;
  }

  async function createOpinionInConfig(
    configId: string,
    overrides: Partial<{
      summary: string;
      final_text: string;
      role_title: string;
      role_description: string;
      review_status: "published" | "pending_review" | "hidden";
      is_data_reuse_consented: boolean;
    }>
  ) {
    const session = await createTestSession(configId, testUser.id);
    return await createTestOpinion(session.id, {
      review_status: "published",
      is_public_by_user: true,
      is_public_by_admin: true,
      is_data_reuse_consented: true,
      ...overrides,
    });
  }

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    for (const configId of configIds) {
      await cleanupTestInterviewConfig(configId);
    }
    configIds.length = 0;
    await cleanupTestUser(testUser.id);
  });

  it("公開×二次利用許諾の意見のみ返し、許諾なし・未公開は除外する", async () => {
    const config = await createConfig();

    await createOpinionInConfig(config.id, {
      summary: "許諾あり",
      final_text: "許諾ありの意見本文",
      role_title: "子育て中の市民",
      role_description: "小学生の子どもを育てている",
    });
    await createOpinionInConfig(config.id, {
      summary: "許諾なし",
      is_data_reuse_consented: false,
    });
    await createOpinionInConfig(config.id, {
      summary: "レビュー保留中",
      review_status: "pending_review",
    });
    await createOpinionInConfig(config.id, {
      summary: "職員が非公開",
      review_status: "hidden",
    });

    const rows = await findOpenData({});
    const summaries = rows.map((r) => r.summary);

    expect(summaries).toContain("許諾あり");
    expect(summaries).not.toContain("許諾なし");
    expect(summaries).not.toContain("レビュー保留中");
    expect(summaries).not.toContain("職員が非公開");

    const row = rows.find((r) => r.summary === "許諾あり");
    expect(row?.interview_config_id).toBe(config.id);
    expect(row?.interview_config_name).toBe(config.name);
    expect(row?.role_title).toBe("子育て中の市民");
    expect(row?.role_description).toBe("小学生の子どもを育てている");
    expect(row?.final_text).toBe("許諾ありの意見本文");
    expect(row?.interview_session_id).not.toBeNull();
  });

  it("公開意見数が閾値未満のテーマは除外する（k-匿名性ゲート）", async () => {
    const config = await createConfig();
    await createOpinionInConfig(config.id, { summary: "ゲート対象" });

    const withThreshold2 = await findOpenData({ minPublicOpinions: 2 });
    expect(withThreshold2.map((r) => r.summary)).not.toContain("ゲート対象");

    const withThreshold1 = await findOpenData({ minPublicOpinions: 1 });
    expect(withThreshold1.map((r) => r.summary)).toContain("ゲート対象");
  });

  it("k-匿名性ゲートは二次利用許諾の有無を問わず公開意見を数える", async () => {
    const config = await createConfig();
    await createOpinionInConfig(config.id, { summary: "許諾あり1件目" });
    // 許諾なしでもゲートの母数（公開意見数）には含まれる
    await createOpinionInConfig(config.id, {
      summary: "許諾なしだが公開済み",
      is_data_reuse_consented: false,
    });

    const rows = await findOpenData({ minPublicOpinions: 2 });
    const summaries = rows.map((r) => r.summary);
    expect(summaries).toContain("許諾あり1件目");
    expect(summaries).not.toContain("許諾なしだが公開済み");
  });

  it("下書き（draft）のテーマの意見は除外する", async () => {
    const config = await createConfig("draft");
    await createOpinionInConfig(config.id, { summary: "下書きテーマ" });

    const rows = await findOpenData({});
    expect(rows.map((r) => r.summary)).not.toContain("下書きテーマ");
  });

  it("新しい順に返り、カーソル以降のページを取得できる", async () => {
    const config = await createConfig();

    // 作成順に created_at が進むため、返却順は「新しい」→「古い」になる
    for (const summary of ["古い", "中間", "新しい"]) {
      await createOpinionInConfig(config.id, { summary });
    }

    // ローカルDBには他の条件合致データが存在し得るため、
    // このテーマの行だけに絞って順序とカーソル動作を検証する
    const allRows = await findOpenData({ limit: 1000 });
    const ownRows = allRows.filter((r) => r.interview_config_id === config.id);
    expect(ownRows.map((r) => r.summary)).toEqual(["新しい", "中間", "古い"]);

    const middle = ownRows[1];
    const afterCursor = await findOpenData({
      limit: 1000,
      cursorCreatedAt: middle.created_at,
      cursorId: middle.opinion_id,
    });
    const ownAfterCursor = afterCursor.filter(
      (r) => r.interview_config_id === config.id
    );
    expect(ownAfterCursor.map((r) => r.summary)).toEqual(["古い"]);
  });
});
