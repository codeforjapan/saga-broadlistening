import {
  cleanupAll,
  cleanupTestInterviewConfig,
  cleanupTestTag,
  createTestInterviewConfig,
  createTestPolicyTag,
  createTestPolicyWithConfig,
  createTestSession,
  createTestTag,
  linkPolicyToInterviewConfig,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import {
  findInterviewConfigWithPoliciesById,
  findOpenInterviewConfigs,
  findOpenInterviewConfigWithPoliciesBySlug,
  findResultsInterviewConfigWithPoliciesBySlug,
} from "./interview-config-repository";

/**
 * findOpenInterviewConfigs は絞り込み・埋め込み集計・ネストの並び替えを
 * すべて PostgREST 側に任せているため、実DBに繋いで検証する。
 */
describe("findOpenInterviewConfigs 統合テスト", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await cleanupAll(...cleanups.map((cleanup) => cleanup()));
    cleanups.length = 0;
  });

  it("募集中テーマを、参加人数・紐づく施策・代表タグ付きで返す", async () => {
    const tag = await createTestTag({ label: "テスト・カテゴリ" });
    cleanups.push(() => cleanupTestTag(tag.id));

    const { policy, config, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
        thumbnail_url: "https://example.com/policy.png",
      },
      config: { status: "open", estimated_duration: 5 },
    });
    cleanups.push(cleanup);
    await createTestPolicyTag(policy.id, tag.id);
    await createTestSession(config.id, null);
    await createTestSession(config.id, null);

    const configs = await findOpenInterviewConfigs();

    const found = configs.find((row) => row.id === config.id);
    expect(found).toBeDefined();
    expect(found?.estimated_duration).toBe(5);
    // 埋め込み集計は [{ count: n }] の形で返る
    expect(found?.interview_sessions[0]?.count).toBe(2);

    const linkedPolicy = found?.policies_interview_configs[0]?.policies;
    expect(linkedPolicy?.publish_status).toBe("published");
    expect(linkedPolicy?.thumbnail_url).toBe("https://example.com/policy.png");
    expect(linkedPolicy?.policies_tags[0]?.tags?.label).toBe(
      "テスト・カテゴリ"
    );
  });

  it("施策に紐づかない抽象テーマ型も返す", async () => {
    const config = await createTestInterviewConfig({ status: "open" });
    cleanups.push(() => cleanupTestInterviewConfig(config.id));

    const configs = await findOpenInterviewConfigs();

    const found = configs.find((row) => row.id === config.id);
    expect(found).toBeDefined();
    expect(found?.policies_interview_configs).toEqual([]);
  });

  it("対話が1件もないテーマは参加人数0として返る", async () => {
    const { config, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
      },
      config: { status: "open" },
    });
    cleanups.push(cleanup);

    const configs = await findOpenInterviewConfigs();

    const found = configs.find((row) => row.id === config.id);
    expect(found?.interview_sessions[0]?.count ?? 0).toBe(0);
  });

  it("募集中でないテーマは返さない", async () => {
    const { config, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
      },
      config: { status: "closed" },
    });
    cleanups.push(cleanup);

    const configs = await findOpenInterviewConfigs();

    expect(configs.some((row) => row.id === config.id)).toBe(false);
  });

  it("非公開の施策も publish_status 付きで返し、一覧に出すかの判定は呼び出し側に委ねる", async () => {
    const { config, cleanup } = await createTestPolicyWithConfig({
      policy: { publish_status: "draft" },
      config: { status: "open" },
    });
    cleanups.push(cleanup);

    const configs = await findOpenInterviewConfigs();

    const found = configs.find((row) => row.id === config.id);
    expect(found?.policies_interview_configs[0]?.policies?.publish_status).toBe(
      "draft"
    );
  });

  it("施策に複数タグがあっても代表タグ1件だけを返す", async () => {
    const firstTag = await createTestTag({ label: "テスト・タグA" });
    cleanups.push(() => cleanupTestTag(firstTag.id));
    const secondTag = await createTestTag({ label: "テスト・タグB" });
    cleanups.push(() => cleanupTestTag(secondTag.id));

    const { policy, config, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
      },
      config: { status: "open" },
    });
    cleanups.push(cleanup);
    await createTestPolicyTag(policy.id, firstTag.id);
    await createTestPolicyTag(policy.id, secondTag.id);

    const configs = await findOpenInterviewConfigs();

    const found = configs.find((row) => row.id === config.id);
    expect(
      found?.policies_interview_configs[0]?.policies?.policies_tags
    ).toHaveLength(1);
  });

  it("1施策に募集中テーマが複数あっても、どちらも返す", async () => {
    const { policy, config, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
      },
      config: { status: "open" },
    });
    cleanups.push(cleanup);

    const secondConfig = await createTestInterviewConfig({ status: "open" });
    cleanups.push(() => cleanupTestInterviewConfig(secondConfig.id));
    await linkPolicyToInterviewConfig(policy.id, secondConfig.id);

    const configs = await findOpenInterviewConfigs();
    const ids = configs.map((row) => row.id);

    expect(ids).toContain(config.id);
    expect(ids).toContain(secondConfig.id);
  });
});

describe("findOpenInterviewConfigWithPoliciesBySlug 統合テスト", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await cleanupAll(...cleanups.map((cleanup) => cleanup()));
    cleanups.length = 0;
  });

  it("slug から募集中テーマを紐づく施策つきで引ける", async () => {
    const { policy, config, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
      },
      config: { status: "open" },
    });
    cleanups.push(cleanup);

    const { data } = await findOpenInterviewConfigWithPoliciesBySlug(
      config.slug
    );

    expect(data?.id).toBe(config.id);
    expect(data?.policies_interview_configs[0]?.policies?.id).toBe(policy.id);
  });

  it("募集中でないテーマは slug でも引けない", async () => {
    const config = await createTestInterviewConfig({ status: "draft" });
    cleanups.push(() => cleanupTestInterviewConfig(config.id));

    const { data } = await findOpenInterviewConfigWithPoliciesBySlug(
      config.slug
    );

    expect(data).toBeNull();
  });
});

describe("findResultsInterviewConfigWithPoliciesBySlug 統合テスト", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await cleanupAll(...cleanups.map((cleanup) => cleanup()));
    cleanups.length = 0;
  });

  it("募集が終わったテーマも引ける（結果は募集終了後も見せる）", async () => {
    const config = await createTestInterviewConfig({ status: "closed" });
    cleanups.push(() => cleanupTestInterviewConfig(config.id));

    const { data } = await findResultsInterviewConfigWithPoliciesBySlug(
      config.slug
    );

    expect(data?.id).toBe(config.id);
    expect(data?.status).toBe("closed");
  });

  it("下書きのテーマは引けない（結果ページも表に出さない）", async () => {
    const config = await createTestInterviewConfig({ status: "draft" });
    cleanups.push(() => cleanupTestInterviewConfig(config.id));

    const { data } = await findResultsInterviewConfigWithPoliciesBySlug(
      config.slug
    );

    expect(data).toBeNull();
  });

  it("紐づく施策の公開状態を返す（公開判定は呼び出し側が行う）", async () => {
    const { policy, config, cleanup } = await createTestPolicyWithConfig({
      policy: { publish_status: "draft" },
      config: { status: "closed" },
    });
    cleanups.push(cleanup);

    const { data } = await findResultsInterviewConfigWithPoliciesBySlug(
      config.slug
    );

    const linkedPolicy = data?.policies_interview_configs[0]?.policies;
    expect(linkedPolicy?.id).toBe(policy.id);
    expect(linkedPolicy?.publish_status).toBe("draft");
  });
});

describe("findInterviewConfigWithPoliciesById 統合テスト", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await cleanupAll(...cleanups.map((cleanup) => cleanup()));
    cleanups.length = 0;
  });

  it("募集中でないテーマも引ける（公開判定は呼び出し側が行う）", async () => {
    const config = await createTestInterviewConfig({ status: "draft" });
    cleanups.push(() => cleanupTestInterviewConfig(config.id));

    const { data } = await findInterviewConfigWithPoliciesById(config.id);

    expect(data?.id).toBe(config.id);
    expect(data?.status).toBe("draft");
  });

  it("未公開施策も publish_status 付きで返す（プレビュー経路が施策を辿れるように）", async () => {
    const { policy, config, cleanup } = await createTestPolicyWithConfig({
      policy: { publish_status: "draft" },
      config: { status: "draft" },
    });
    cleanups.push(cleanup);

    const { data } = await findInterviewConfigWithPoliciesById(config.id);

    const linkedPolicy = data?.policies_interview_configs[0]?.policies;
    expect(linkedPolicy?.id).toBe(policy.id);
    expect(linkedPolicy?.publish_status).toBe("draft");
  });
});
