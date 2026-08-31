import {
  cleanupAll,
  cleanupTestTag,
  createTestInterviewConfig,
  cleanupTestInterviewConfig,
  createTestPolicyTag,
  createTestPolicyWithConfig,
  createTestSession,
  createTestTag,
  linkPolicyToInterviewConfig,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import { buildInterviewThemes } from "../../shared/utils/interview-theme";
import {
  findOpenInterviewConfigByPolicyId,
  findOpenInterviewConfigLinks,
} from "./interview-config-repository";

/**
 * findOpenInterviewConfigLinks は絞り込み・埋め込み集計・ネストの並び替えを
 * すべて PostgREST 側に任せているため、実DBに繋いで検証する。
 */
describe("findOpenInterviewConfigLinks 統合テスト", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await cleanupAll(...cleanups.map((cleanup) => cleanup()));
    cleanups.length = 0;
  });

  it("募集中テーマと公開施策の組み合わせを、参加人数・代表タグ付きで返す", async () => {
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

    const links = await findOpenInterviewConfigLinks();

    const found = links.find((link) => link.policy_id === policy.id);
    expect(found).toBeDefined();
    expect(found?.policies.thumbnail_url).toBe(
      "https://example.com/policy.png"
    );
    expect(found?.policies.policies_tags[0]?.tags?.label).toBe(
      "テスト・カテゴリ"
    );
    expect(found?.interview_configs.id).toBe(config.id);
    expect(found?.interview_configs.estimated_duration).toBe(5);
    // 埋め込み集計は [{ count: n }] の形で返る
    expect(found?.interview_configs.interview_sessions[0]?.count).toBe(2);
  });

  it("対話が1件もないテーマは参加人数0として返る", async () => {
    const { policy, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
      },
      config: { status: "open" },
    });
    cleanups.push(cleanup);

    const links = await findOpenInterviewConfigLinks();

    const found = links.find((link) => link.policy_id === policy.id);
    expect(found?.interview_configs.interview_sessions[0]?.count ?? 0).toBe(0);
  });

  it("募集中でないテーマは返さない", async () => {
    const { policy, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
      },
      config: { status: "closed" },
    });
    cleanups.push(cleanup);

    const links = await findOpenInterviewConfigLinks();

    expect(links.some((link) => link.policy_id === policy.id)).toBe(false);
  });

  it("非公開の施策との紐付けは返さない", async () => {
    const { policy, cleanup } = await createTestPolicyWithConfig({
      policy: { publish_status: "draft" },
      config: { status: "open" },
    });
    cleanups.push(cleanup);

    const links = await findOpenInterviewConfigLinks();

    expect(links.some((link) => link.policy_id === policy.id)).toBe(false);
  });

  it("施策に複数タグがあっても代表タグ1件だけを返す", async () => {
    const firstTag = await createTestTag({ label: "テスト・タグA" });
    cleanups.push(() => cleanupTestTag(firstTag.id));
    const secondTag = await createTestTag({ label: "テスト・タグB" });
    cleanups.push(() => cleanupTestTag(secondTag.id));

    const { policy, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
      },
      config: { status: "open" },
    });
    cleanups.push(cleanup);
    await createTestPolicyTag(policy.id, firstTag.id);
    await createTestPolicyTag(policy.id, secondTag.id);

    const links = await findOpenInterviewConfigLinks();

    const found = links.find((link) => link.policy_id === policy.id);
    expect(found?.policies.policies_tags).toHaveLength(1);
  });
});

/**
 * 施策から意見募集を1件に決める順序は SQL（findOpenInterviewConfigByPolicyId）と
 * TS（buildInterviewThemes）の2か所にある。ずれるとカードの表示テーマと遷移先LPの
 * テーマが食い違うため、同じデータで同じ1件を選ぶことを実DBで固定する。
 */
describe("テーマの絞り込み順序が LP の解決と一致する", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await cleanupAll(...cleanups.map((cleanup) => cleanup()));
    cleanups.length = 0;
  });

  it("1施策に募集中テーマが2件あるとき、一覧に残るテーマとLPが開くテーマが同じ", async () => {
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

    const links = await findOpenInterviewConfigLinks();
    const themes = buildInterviewThemes(
      links
        .filter((link) => link.policy_id === policy.id)
        .map((link) => ({
          policyId: link.policy_id,
          linkedAt: link.created_at,
          policyThumbnailUrl: link.policies.thumbnail_url,
          policyTagLabel: link.policies.policies_tags[0]?.tags?.label ?? null,
          config: {
            id: link.interview_configs.id,
            name: link.interview_configs.name,
            description: link.interview_configs.description,
            estimatedDuration: link.interview_configs.estimated_duration,
            thumbnailUrl: link.interview_configs.thumbnail_url,
            createdAt: link.interview_configs.created_at,
            participantCount:
              link.interview_configs.interview_sessions[0]?.count ?? 0,
          },
        }))
    );

    const { data: resolvedByLp } = await findOpenInterviewConfigByPolicyId(
      policy.id
    );

    expect(themes).toHaveLength(1);
    expect(themes[0].id).toBe(resolvedByLp?.id);
    // 2件のうちどちらかが選ばれ、もう一方は一覧から落ちている
    expect([config.id, secondConfig.id]).toContain(themes[0].id);
  });
});
