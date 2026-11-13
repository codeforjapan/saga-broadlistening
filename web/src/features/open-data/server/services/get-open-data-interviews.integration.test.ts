import { MIN_PUBLIC_OPINIONS_FOR_DISPLAY } from "@mirai-gikai/shared/report-publication/auto-publish";
import {
  cleanupTestUser,
  createTestPolicyWithConfig,
  createTestPublicOpinions,
  createTestUser,
  insertTestInterviewMessages,
  type TestUser,
} from "@test-utils/utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getOpenDataInterviews } from "./get-open-data-interviews";

/**
 * getOpenDataInterviews は find_open_data_opinions RPC の薄いラッパー。
 * 絞り込み・並び順・カーソルは RPC 側のテスト
 * （tests/supabase/db-function/find-open-data-opinions.test.ts）で確認済みなので、
 * ここでは web 側でしか通らない「interview_messages → { role, content } の整形」を検証する。
 *
 * k-匿名性ゲート（テーマあたり公開意見 >= MIN_PUBLIC_OPINIONS_FOR_DISPLAY）を
 * 満たすデータが要るため、残りは水増しで埋める。ローカルDBには他の条件合致データが
 * 存在し得るため、検証はこのテストの意見募集の行だけに絞って行う。
 */
describe("getOpenDataInterviews", () => {
  let testUser: TestUser;
  let configId: string;
  let cleanupPolicyWithConfig: () => Promise<void>;

  beforeAll(async () => {
    testUser = await createTestUser();
    const { config, cleanup } = await createTestPolicyWithConfig({
      policy: {
        publish_status: "published",
        published_at: new Date().toISOString(),
      },
      config: { name: `オープンデータ統合テスト ${Date.now()}` },
    });
    configId = config.id;
    cleanupPolicyWithConfig = cleanup;

    // ゲートを満たす数の公開意見を作成し、うち2件だけ二次利用許諾を付ける
    const { sessions } = await createTestPublicOpinions({
      interviewConfigId: configId,
      userId: testUser.id,
      count: MIN_PUBLIC_OPINIONS_FOR_DISPLAY,
      opinion: (index) => {
        const consented = index < 2;
        return {
          is_data_reuse_consented: consented,
          final_text: consented
            ? `許諾済み本文${index}`
            : `許諾なし本文${index}`,
          summary: consented ? `許諾済み${index}` : `許諾なし${index}`,
          // index=1（許諾済みの新しい方）> index=0 となるよう作成時刻をずらす
          created_at: new Date(
            Date.UTC(2026, 0, 1) + index * 60_000
          ).toISOString(),
        };
      },
    });

    // 新しい方の許諾済みセッションにだけ会話ログを付ける。
    // 同一 INSERT だと created_at が同値になり時系列順が不定になるため明示する
    await insertTestInterviewMessages(sessions[1].id, [
      {
        role: "assistant",
        content: "質問です",
        created_at: "2026-01-01T00:00:00+00:00",
      },
      {
        role: "user",
        content: "回答です",
        created_at: "2026-01-01T00:00:01+00:00",
      },
    ]);
  });

  afterAll(async () => {
    await cleanupPolicyWithConfig();
    await cleanupTestUser(testUser.id);
  });

  it("許諾済み意見の会話ログを時系列で整形して返す", async () => {
    const page = await getOpenDataInterviews({ limit: 1000, cursor: null });
    const mine = page.items.filter(
      (item) => item.interviewConfigId === configId
    );

    // 許諾なしの意見は含まれず、新しい順
    expect(mine.map((item) => item.summary)).toEqual([
      "許諾済み1",
      "許諾済み0",
    ]);

    const [newer, older] = mine;
    expect(newer?.finalText).toBe("許諾済み本文1");
    expect(newer?.messages).toEqual([
      { role: "assistant", content: "質問です" },
      { role: "user", content: "回答です" },
    ]);
    // メッセージなしのセッションは空配列
    expect(older?.messages).toEqual([]);
  });
});
