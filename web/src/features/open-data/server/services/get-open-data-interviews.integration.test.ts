import { MIN_PUBLIC_OPINIONS_FOR_DISPLAY } from "@mirai-gikai/shared/report-publication/auto-publish";
import {
  adminClient,
  cleanupTestPolicy,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestPolicy,
  createTestUser,
  linkPolicyToInterviewConfig,
  type TestUser,
} from "@test-utils/utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getOpenDataInterviews } from "./get-open-data-interviews";

/**
 * k-匿名性ゲート（テーマあたり公開意見 >= MIN_PUBLIC_OPINIONS_FOR_DISPLAY）を
 * 満たすデータを実DBに作り、サービス全体（RPC + メッセージ取得 + 整形）を検証する。
 * ローカルDBには他の条件合致データが存在し得るため、検証はこのテストの
 * 意見募集の行だけに絞って行う。
 */
describe("getOpenDataInterviews", () => {
  let testUser: TestUser;
  let policyId: string;
  let configId: string;

  beforeAll(async () => {
    testUser = await createTestUser();
    const policy = await createTestPolicy({
      publish_status: "published",
      published_at: new Date().toISOString(),
    });
    policyId = policy.id;

    const config = await createTestInterviewConfig({
      name: `オープンデータ統合テスト ${Date.now()}`,
    });
    configId = config.id;
    await linkPolicyToInterviewConfig(policyId, configId);

    // ゲートを満たす数の公開意見を作成し、うち2件だけ二次利用許諾を付ける
    for (let i = 0; i < MIN_PUBLIC_OPINIONS_FOR_DISPLAY; i++) {
      const { data: session, error: sessionError } = await adminClient
        .from("interview_sessions")
        .insert({
          interview_config_id: config.id,
          user_id: testUser.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (sessionError) throw new Error(sessionError.message);

      const consented = i < 2;
      const { error: opinionError } = await adminClient
        .from("opinions")
        .insert({
          interview_session_id: session.id,
          is_public_by_user: true,
          is_public_by_admin: true,
          review_status: "published",
          is_data_reuse_consented: consented,
          final_text: consented ? `許諾済み本文${i}` : `許諾なし本文${i}`,
          summary: consented ? `許諾済み${i}` : `許諾なし${i}`,
          // i=1（許諾済みの新しい方）> i=0 となるよう作成時刻をずらす
          created_at: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(),
        });
      if (opinionError) throw new Error(opinionError.message);

      // 新しい方の許諾済みセッションにだけ会話ログを付ける。
      // 同一insertだと created_at が同値になり時系列順が不定になるため明示する
      if (i === 1) {
        const { error: messageError } = await adminClient
          .from("interview_messages")
          .insert([
            {
              interview_session_id: session.id,
              role: "assistant",
              content: "質問です",
              created_at: "2026-01-01T00:00:00+00:00",
            },
            {
              interview_session_id: session.id,
              role: "user",
              content: "回答です",
              created_at: "2026-01-01T00:00:01+00:00",
            },
          ]);
        if (messageError) throw new Error(messageError.message);
      }
    }
  });

  afterAll(async () => {
    await cleanupTestPolicy(policyId);
    await adminClient.from("interview_configs").delete().eq("id", configId);
    await cleanupTestUser(testUser.id);
  });

  it("許諾済み意見のみを新しい順に返し、会話ログを整形する", async () => {
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
    // 会話ログが時系列で紐づく（メッセージなしのセッションは空配列）
    expect(newer?.messages).toEqual([
      { role: "assistant", content: "質問です" },
      { role: "user", content: "回答です" },
    ]);
    expect(older?.messages).toEqual([]);
  });

  it("cursor 以降のページには古い意見だけが含まれる", async () => {
    const page = await getOpenDataInterviews({ limit: 1000, cursor: null });
    const newer = page.items.find((item) => item.summary === "許諾済み1");
    expect(newer).toBeTruthy();
    if (!newer) return;

    const afterCursor = await getOpenDataInterviews({
      limit: 1000,
      cursor: { createdAt: newer.createdAt, id: newer.opinionId },
    });
    const mine = afterCursor.items.filter(
      (item) => item.interviewConfigId === configId
    );
    expect(mine.map((item) => item.summary)).toEqual(["許諾済み0"]);
  });
});
