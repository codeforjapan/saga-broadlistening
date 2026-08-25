import {
  countAllOpinions,
  countPendingReextraction,
  findOpinionsToReextract,
  markReextractionAttempted,
  resetReextractionForInterviewConfig,
} from "@mirai-gikai/topic-analysis-core/repository";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupTestInterviewConfig,
  createTestSession,
} from "./db-function/helpers";
import {
  adminClient,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestOpinion,
  createTestUser,
  type TestUser,
} from "./utils";

/**
 * 意見の再抽出バックフィル用リポジトリの統合テスト。
 *
 * ウォーターマーク（opinions.opinions_reextracted_at）の意味づけと、
 * テーマ（interview_config）単位の絞り込みが PostgREST 越しで効くことを確かめる。
 */

/** 共有 config 配下に session + opinion を1件作る。 */
async function createOpinion(opts: {
  configId: string;
  userId: string;
  isPublicByUser: boolean;
  createdAt: string;
  reextracted?: boolean;
}) {
  const session = await createTestSession(opts.configId, opts.userId, {
    started_at: opts.createdAt,
    completed_at: opts.createdAt,
  });
  const opinion = await createTestOpinion(session.id, {
    is_public_by_user: opts.isPublicByUser,
  });

  // created_at と再抽出ウォーターマークは INSERT 時の既定値で決まるため、
  // 並び順・未処理判定を検証できるよう作成後に上書きする。
  const { data, error } = await adminClient
    .from("opinions")
    .update({
      created_at: opts.createdAt,
      opinions_reextracted_at: opts.reextracted ? opts.createdAt : null,
    })
    .eq("id", opinion.id)
    .select()
    .single();
  if (error) throw new Error(`opinions 更新失敗: ${error.message}`);
  return data;
}

describe("opinion-reextraction repository 統合テスト", () => {
  let testUser: TestUser;
  let configId: string;

  beforeAll(async () => {
    testUser = await createTestUser();
    const config = await createTestInterviewConfig({ name: "backfill-test" });
    configId = config.id;
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(configId);
    await cleanupTestUser(testUser.id);
  });

  it("findOpinionsToReextract は公開同意優先・古い順で未処理のみ返す", async () => {
    const publicOld = await createOpinion({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2021-01-01T00:00:00Z",
    });
    const publicNew = await createOpinion({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2022-01-01T00:00:00Z",
    });
    const privateOldest = await createOpinion({
      configId,
      userId: testUser.id,
      isPublicByUser: false,
      createdAt: "2020-01-01T00:00:00Z",
    });
    const alreadyDone = await createOpinion({
      configId,
      userId: testUser.id,
      isPublicByUser: true,
      createdAt: "2019-01-01T00:00:00Z",
      reextracted: true,
    });

    // グローバルクエリのため、自分の作成分だけに絞って検証する
    const myIds = new Set([
      publicOld.id,
      publicNew.id,
      privateOldest.id,
      alreadyDone.id,
    ]);
    const all = await findOpinionsToReextract(10000);
    const mine = all.filter((r) => myIds.has(r.opinionId));

    // 再抽出済み(alreadyDone)は含まれない
    expect(mine.map((r) => r.opinionId)).not.toContain(alreadyDone.id);
    // 公開優先 → 同一公開区分は created_at 昇順
    expect(mine.map((r) => r.opinionId)).toEqual([
      publicOld.id,
      publicNew.id,
      privateOldest.id,
    ]);
  });

  it("countPendingReextraction は markReextractionAttempted で減る", async () => {
    const opinion = await createOpinion({
      configId,
      userId: testUser.id,
      isPublicByUser: false,
      createdAt: "2024-01-01T00:00:00Z",
    });

    const before = await countPendingReextraction();
    await markReextractionAttempted(opinion.id, "2026-06-08T01:00:00Z");
    const after = await countPendingReextraction();

    expect(after).toBe(before - 1);

    // 意見本文は変えずに処理時刻だけ記録されている
    const { data: row } = await adminClient
      .from("opinions")
      .select("final_text, opinions_reextracted_at")
      .eq("id", opinion.id)
      .single();
    expect(row?.final_text).toBe(opinion.final_text);
    expect(new Date(row?.opinions_reextracted_at ?? 0).getTime()).toBe(
      new Date("2026-06-08T01:00:00Z").getTime()
    );
  });
});

describe("opinion-reextraction repository テーマスコープ統合テスト", () => {
  let testUser: TestUser;
  let configA: string;
  let configB: string;
  // テーマ A の意見（公開新旧 / 非公開 / 再抽出済み）
  let aPublicOld: string;
  let aPublicNew: string;
  let aPrivate: string;
  let aDone: string;
  // テーマ B の意見（混入しないことの検証用）
  let bOpinion: string;

  beforeAll(async () => {
    testUser = await createTestUser();
    configA = (await createTestInterviewConfig({ name: "scope-test-a" })).id;
    configB = (await createTestInterviewConfig({ name: "scope-test-b" })).id;

    const base = { userId: testUser.id };
    aPublicOld = (
      await createOpinion({
        ...base,
        configId: configA,
        isPublicByUser: true,
        createdAt: "2021-01-01T00:00:00Z",
      })
    ).id;
    aPublicNew = (
      await createOpinion({
        ...base,
        configId: configA,
        isPublicByUser: true,
        createdAt: "2022-01-01T00:00:00Z",
      })
    ).id;
    aPrivate = (
      await createOpinion({
        ...base,
        configId: configA,
        isPublicByUser: false,
        createdAt: "2020-01-01T00:00:00Z",
      })
    ).id;
    aDone = (
      await createOpinion({
        ...base,
        configId: configA,
        isPublicByUser: true,
        createdAt: "2019-01-01T00:00:00Z",
        reextracted: true,
      })
    ).id;
    bOpinion = (
      await createOpinion({
        ...base,
        configId: configB,
        isPublicByUser: true,
        createdAt: "2021-06-01T00:00:00Z",
      })
    ).id;
  });

  afterAll(async () => {
    await cleanupTestInterviewConfig(configA);
    await cleanupTestInterviewConfig(configB);
    await cleanupTestUser(testUser.id);
  });

  it("findOpinionsToReextract(configA) はテーマAの未処理のみを公開優先・古い順で返す", async () => {
    const ids = (await findOpinionsToReextract(10000, configA)).map(
      (r) => r.opinionId
    );
    // 公開(true)→created_at昇順、その後 非公開。再抽出済み(aDone)と他テーマ(bOpinion)は除外。
    expect(ids).toEqual([aPublicOld, aPublicNew, aPrivate]);
    expect(ids).not.toContain(aDone);
    expect(ids).not.toContain(bOpinion);
  });

  it("countPendingReextraction / countAllOpinions はテーマ単位に限定される", async () => {
    expect(await countPendingReextraction(configA)).toBe(3);
    expect(await countAllOpinions(configA)).toBe(4);
    // 他テーマは別カウント（!inner join が件数を変えないことの回帰）
    expect(await countPendingReextraction(configB)).toBe(1);
    expect(await countAllOpinions(configB)).toBe(1);
  });

  // watermark を変更するため、件数を検証する他テストの後（describe 末尾）に置く。
  it("resetReextractionForInterviewConfig はテーマAの再抽出済みを未再抽出に戻す", async () => {
    // 事前: aDone のみ再抽出済み（pending=3 / total=4）
    expect(await countPendingReextraction(configA)).toBe(3);

    // 再抽出済み(NOT NULL)の行だけ NULL に戻すため、戻り値は aDone の1件。
    const reset = await resetReextractionForInterviewConfig(configA);
    expect(reset).toBe(1);

    // リセット後は全件が未再抽出 = pending が total と一致する
    expect(await countPendingReextraction(configA)).toBe(4);
    expect(await countAllOpinions(configA)).toBe(4);
    // 他テーマは影響を受けない
    expect(await countPendingReextraction(configB)).toBe(1);
  });
});
