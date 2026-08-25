import {
  findPublicBillRespondentRows,
  getPublicRespondents,
} from "@mirai-gikai/topic-analysis-core/public-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MIN_PUBLIC_OPINIONS_FOR_DISPLAY } from "../../packages/shared/src/report-publication/auto-publish";
import {
  cleanupTestInterviewConfig,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestPublicOpinions,
  createTestUser,
  type TestUser,
} from "./utils";

/**
 * 回答一覧（getPublicRespondents）の k-匿名性ゲート統合テスト。
 * 公開意見（review_status='published'）が MIN_PUBLIC_OPINIONS_FOR_DISPLAY 件未満の
 * 意見募集では、回答者個人の属性（role_title・summary）を返さないことを確認する。
 *
 * ゲートの単位は施策ではなく意見募集（テーマ）。
 */
describe("getPublicRespondents の k-匿名性ゲート 統合テスト", () => {
  let testUser: TestUser;
  const createdConfigIds: string[] = [];

  /** 公開済み（review_status='published'）の意見を count 件持つ意見募集を作る。 */
  async function createConfigWithPublicOpinions(
    count: number
  ): Promise<string> {
    const config = await createTestInterviewConfig();
    createdConfigIds.push(config.id);

    await createTestPublicOpinions({
      interviewConfigId: config.id,
      userId: testUser.id,
      count,
      opinion: (index) => ({
        // moderation_status は moderation_score からの生成列のため指定しない。
        moderation_score: 5,
        role_title: `テスト回答者${index + 1}`,
        summary: `テスト要約${index + 1}`,
      }),
    });

    return config.id;
  }

  beforeAll(async () => {
    testUser = await createTestUser();
  });

  afterAll(async () => {
    for (const configId of createdConfigIds) {
      await cleanupTestInterviewConfig(configId);
    }
    await cleanupTestUser(testUser.id);
  });

  it("公開意見がしきい値未満なら回答者を返さない", async () => {
    const configId = await createConfigWithPublicOpinions(
      MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 1
    );

    // 公開条件自体は満たしている（＝ゲートだけで隠されている）ことを確認する。
    const rows = await findPublicBillRespondentRows(configId);
    expect(rows).toHaveLength(MIN_PUBLIC_OPINIONS_FOR_DISPLAY - 1);

    expect(await getPublicRespondents(configId)).toEqual([]);
  });

  it("公開意見がしきい値以上なら回答者を返す", async () => {
    const configId = await createConfigWithPublicOpinions(
      MIN_PUBLIC_OPINIONS_FOR_DISPLAY
    );

    const respondents = await getPublicRespondents(configId);

    expect(respondents).toHaveLength(MIN_PUBLIC_OPINIONS_FOR_DISPLAY);
    expect(respondents[0].role_title).toMatch(/^テスト回答者/);
    expect(respondents[0].summary).toMatch(/^テスト要約/);
  });
});
