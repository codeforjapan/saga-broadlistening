import {
  buildTurnTopics,
  computeSummaryState,
  computeTurnState,
  RESUME_TOPIC_ID,
} from "./turn-control";
import { describe, expect, it } from "vitest";
import {
  buildChatTurnRecord,
  buildInitialTurnContent,
  buildSummaryTurnRecord,
} from "./turn-records";

const topics = buildTurnTopics(
  [
    { id: "q1", question: "関わりは？", step_kind: "fact", turn_budget: 1 },
    { id: "q2", question: "場面は？", quick_replies: ["思い出せない"] },
  ],
  { purposeType: null, subject: "theme" }
);
const metas = [{ questionId: "q1", budgetExempt: false }];

function chatOutput(fields: Record<string, unknown>): string {
  return JSON.stringify({
    question_id: "Q2",
    topic_title: "場面",
    text: "ふだんの場面を教えてください。",
    end_request: false,
    personal_request: false,
    off_topic: false,
    ...fields,
  });
}

describe("buildChatTurnRecord", () => {
  const state = computeTurnState({ topics, metas });

  it("question_id を質問のIDに読み替え、初めて聞く質問に選択肢を付ける", () => {
    const record = buildChatTurnRecord({
      rawText: chatOutput({}),
      state,
      metas,
    });
    expect(JSON.parse(record.content)).toMatchObject({
      text: "ふだんの場面を教えてください。",
      question_id: "q2",
      topic_title: "質問2",
      quick_replies: ["思い出せない", "この質問はとばす"],
      stage: "chat",
      next_stage: "chat",
      parse_failed: false,
    });
    expect(record.injected).toEqual({
      resolved_question_id: "q2",
      resolved_topic_title: "質問2",
      quick_replies: ["思い出せない", "この質問はとばす"],
      next_stage: "chat",
      chain_summary: false,
    });
    expect(record.sessionUpdate).toBeNull();
  });

  it("終えたいと言われたら要約へ進め、続けて要約を取りにいく", () => {
    const record = buildChatTurnRecord({
      rawText: chatOutput({ end_request: true }),
      state,
      metas,
    });
    expect(record.injected.next_stage).toBe("summary");
    expect(record.injected.chain_summary).toBe(true);
    expect(record.sessionUpdate).toEqual({
      stage: "summary",
      summary_phase: "first",
      end_reason: "end_request",
    });
  });

  it("個別の要望への対応は予算から除く", () => {
    const record = buildChatTurnRecord({
      rawText: chatOutput({ personal_request: true }),
      state,
      metas,
    });
    expect(JSON.parse(record.content).budget_exempt).toBe(true);
  });

  it("パースに失敗したら本文はそのまま、question_id はコードの値にする", () => {
    const record = buildChatTurnRecord({
      rawText: "壊れた出力",
      state,
      metas,
    });
    expect(JSON.parse(record.content)).toMatchObject({
      text: "壊れた出力",
      question_id: "q2",
      parse_failed: true,
    });
  });
});

describe("buildSummaryTurnRecord", () => {
  it("要約に同意したら完了にする", () => {
    const summaryState = computeSummaryState({
      assistantTurn: 8,
      phase: "reply",
      resumeUsed: false,
      forceClose: false,
    });
    const record = buildSummaryTurnRecord({
      rawText: JSON.stringify({
        text: "ありがとうございました。",
        summary_response: "agree",
        report: { summary: "要約" },
      }),
      summaryState,
    });
    expect(record.injected.next_stage).toBe("summary_complete");
    expect(record.sessionUpdate).toEqual({
      stage: "summary_complete",
      summary_phase: null,
    });
    expect(JSON.parse(record.content).report).toEqual({ summary: "要約" });
  });

  it("インタビューに戻るときは再開の話題を開き、レポートを残さない", () => {
    const summaryState = computeSummaryState({
      assistantTurn: 8,
      phase: "reply",
      resumeUsed: false,
      forceClose: false,
    });
    const record = buildSummaryTurnRecord({
      rawText: JSON.stringify({
        text: "続けてどうぞ。",
        summary_response: "resume",
        report: { summary: "要約" },
      }),
      summaryState,
    });
    expect(JSON.parse(record.content)).toMatchObject({
      question_id: RESUME_TOPIC_ID,
      report: null,
      next_stage: "chat",
    });
    expect(record.sessionUpdate).toEqual({
      stage: "chat",
      summary_phase: null,
      resume_used: true,
    });
  });
});

describe("buildInitialTurnContent", () => {
  it("最初の話題の ID と選択肢を付ける", () => {
    const content = JSON.parse(
      buildInitialTurnContent({
        rawText: JSON.stringify({
          question_id: "Q1",
          topic_title: "関わり",
          text: "こんにちは。",
        }),
        firstTopic: topics[1],
      })
    );
    expect(content).toMatchObject({
      text: "こんにちは。",
      question_id: "q2",
      topic_title: "はじめに",
      quick_replies: ["思い出せない", "この質問はとばす"],
      end_request: false,
    });
  });
});
