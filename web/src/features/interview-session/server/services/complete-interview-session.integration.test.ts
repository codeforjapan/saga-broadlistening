import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  adminClient,
  createTestUser,
  cleanupTestUser,
  createTestInterviewData,
  cleanupTestPolicy,
  type TestUser,
} from "@test-utils/utils";
import { completeInterviewSession } from "./complete-interview-session";

const contentRichness = {
  total: 70,
  clarity: 80,
  specificity: 60,
  impact: 70,
  constructiveness: 65,
  reasoning: "明確な意見表明があり、具体的な理由も述べられている",
};

// interviewChatWithReportSchema に準拠したレポートデータ
const validReportMessage = JSON.stringify({
  text: "インタビューのまとめです。",
  report: {
    summary: "テスト施策に賛成の立場",
    final_text: "この施策には賛成です。社会全体の利益になると考えるためです。",
    role_description: "一般市民として施策に関心がある",
    role_title: "会社員",
    opinions: [
      {
        title: "賛成の理由",
        content: "社会全体の利益になると考える",
        source_message_id: null,
        contextual_quote: "（施策について）社会全体の利益になると思う",
      },
    ],
    content_richness: contentRichness,
  },
});

// 2件の意見を持つレポート（dual-write の縮小・id安定性検証用）
function buildReportMessage(
  opinions: Array<{
    title: string;
    content: string;
    source_message_id: string | null;
    contextual_quote?: string | null;
  }>
): string {
  return JSON.stringify({
    text: "インタビューのまとめです。",
    report: {
      summary: "テスト施策に賛成の立場",
      final_text: "この施策には賛成です。",
      role_description: "一般市民として施策に関心がある",
      role_title: "会社員",
      opinions: opinions.map((o) => ({
        contextual_quote: null,
        ...o,
      })),
      content_richness: contentRichness,
    },
  });
}

describe("completeInterviewSession 統合テスト", () => {
  let testUser: TestUser;
  let sessionId: string;
  let billId: string;

  beforeEach(async () => {
    testUser = await createTestUser();
    const data = await createTestInterviewData(testUser.id);
    sessionId = data.session.id;
    billId = data.policy.id;
  });

  afterEach(async () => {
    await cleanupTestPolicy(billId);
    await cleanupTestUser(testUser.id);
  });

  it("レポート入りメッセージからセッションを完了できる", async () => {
    // assistant メッセージ（レポート付き）を作成
    await adminClient.from("interview_messages").insert([
      {
        interview_session_id: sessionId,
        role: "user",
        content: "この施策に賛成です",
      },
      {
        interview_session_id: sessionId,
        role: "assistant",
        content: validReportMessage,
      },
    ]);

    const report = await completeInterviewSession({ sessionId });

    // 戻り値を検証
    expect(report.interview_session_id).toBe(sessionId);
    expect(report.summary).toBe("テスト施策に賛成の立場");
    expect(report.final_text).toBe(
      "この施策には賛成です。社会全体の利益になると考えるためです。"
    );

    // DB 状態を検証: 意見が保存されていること
    const { data: dbReport } = await adminClient
      .from("opinions")
      .select("*")
      .eq("interview_session_id", sessionId)
      .single();

    expect(dbReport).toBeTruthy();
    expect(dbReport?.summary).toBe("テスト施策に賛成の立場");

    // DB 状態を検証: セッションが completed になっていること
    const { data: dbSession } = await adminClient
      .from("interview_sessions")
      .select("completed_at")
      .eq("id", sessionId)
      .single();

    expect(dbSession?.completed_at).toBeTruthy();

    // DB 状態を検証: opinion_segments に同期されていること
    const { data: segments } = await adminClient
      .from("opinion_segments")
      .select("*")
      .eq("opinion_id", report.id)
      .order("opinion_index", { ascending: true });

    expect(segments).toHaveLength(1);
    expect(segments?.[0]).toMatchObject({
      opinion_index: 0,
      title: "賛成の理由",
      content: "社会全体の利益になると考える",
      contextual_quote: "（施策について）社会全体の利益になると思う",
    });
  });

  it("再完了しても opinion_segments.id(UUID) が安定する", async () => {
    await adminClient.from("interview_messages").insert({
      interview_session_id: sessionId,
      role: "assistant",
      content: buildReportMessage([
        { title: "意見A", content: "内容A", source_message_id: null },
        { title: "意見B", content: "内容B", source_message_id: null },
      ]),
    });

    const report = await completeInterviewSession({ sessionId });
    const { data: first } = await adminClient
      .from("opinion_segments")
      .select("id, opinion_index")
      .eq("opinion_id", report.id)
      .order("opinion_index", { ascending: true });

    // 同じ内容で再完了（ON CONFLICT DO UPDATE で id は変わらないはず）
    await completeInterviewSession({ sessionId });
    const { data: second } = await adminClient
      .from("opinion_segments")
      .select("id, opinion_index")
      .eq("opinion_id", report.id)
      .order("opinion_index", { ascending: true });

    expect(first).toHaveLength(2);
    expect(second?.map((o) => o.id)).toEqual(first?.map((o) => o.id));
  });

  it("意見数が減った再完了で末尾の opinion_segments 行が削除される", async () => {
    // 1回目: 2件
    await adminClient.from("interview_messages").insert({
      interview_session_id: sessionId,
      role: "assistant",
      content: buildReportMessage([
        { title: "意見A", content: "内容A", source_message_id: null },
        { title: "意見B", content: "内容B", source_message_id: null },
      ]),
    });
    const report = await completeInterviewSession({ sessionId });
    const { data: before } = await adminClient
      .from("opinion_segments")
      .select("id")
      .eq("opinion_id", report.id);
    expect(before).toHaveLength(2);

    // 2回目: より新しい assistant メッセージで 1件に縮小
    await adminClient.from("interview_messages").insert({
      interview_session_id: sessionId,
      role: "assistant",
      content: buildReportMessage([
        { title: "意見A", content: "内容A", source_message_id: null },
      ]),
    });
    await completeInterviewSession({ sessionId });

    const { data: after } = await adminClient
      .from("opinion_segments")
      .select("opinion_index")
      .eq("opinion_id", report.id);
    expect(after).toHaveLength(1);
    expect(after?.[0].opinion_index).toBe(0);
  });

  it("レポートが見つからない場合はエラーを throw する", async () => {
    // レポートなしのメッセージのみ
    await adminClient.from("interview_messages").insert([
      {
        interview_session_id: sessionId,
        role: "user",
        content: "普通のメッセージ",
      },
      {
        interview_session_id: sessionId,
        role: "assistant",
        content: "普通の応答メッセージ",
      },
    ]);

    await expect(completeInterviewSession({ sessionId })).rejects.toThrow(
      "No report found in conversation messages"
    );

    // DB 状態を検証: セッションが completed になっていないこと
    const { data: dbSession } = await adminClient
      .from("interview_sessions")
      .select("completed_at")
      .eq("id", sessionId)
      .single();

    expect(dbSession?.completed_at).toBeNull();

    // DB 状態を検証: 意見が作成されていないこと
    const { data: dbReport } = await adminClient
      .from("opinions")
      .select("*")
      .eq("interview_session_id", sessionId);

    expect(dbReport).toHaveLength(0);
  });

  it("複数の assistant メッセージがある場合、最新のレポートを使う", async () => {
    // 古い assistant メッセージ（レポートなし）→ 新しい assistant メッセージ（レポートあり）
    await adminClient.from("interview_messages").insert([
      {
        interview_session_id: sessionId,
        role: "assistant",
        content: "最初の質問です",
      },
      {
        interview_session_id: sessionId,
        role: "user",
        content: "回答です",
      },
      {
        interview_session_id: sessionId,
        role: "assistant",
        content: validReportMessage,
      },
    ]);

    const report = await completeInterviewSession({ sessionId });
    expect(report.summary).toBe("テスト施策に賛成の立場");
  });
});
