import { describe, expect, it } from "vitest";
import {
  type AssistantTurnMeta,
  buildTurnTopics,
  computeSummaryState,
  computeTurnState,
  RESUME_TOPIC_ID,
} from "./turn-control";
import {
  buildChatTurnRecord,
  buildInitialTurnContent,
  buildSummaryTurnRecord,
  readTopicTitle,
} from "./turn-records";

const topics = buildTurnTopics([
  { id: "q1", question: "関わりは？" },
  { id: "q2", question: "場面は？", quick_replies: ["思い出せない"] },
]);
const metas: AssistantTurnMeta[] = [
  { questionId: "q1", stage: "chat" },
];
const summaryReplyMetas: AssistantTurnMeta[] = [
  ...metas,
  { questionId: null, stage: "summary" },
];

function chatOutput(fields: Record<string, unknown>): string {
  return JSON.stringify({
    question_id: "Q2",
    topic_title: "場面",
    text: "ふだんの場面を教えてください。",
    end_request: false,
    ...fields,
  });
}

describe("buildChatTurnRecord", () => {
  const state = computeTurnState({ topics, metas });

  it("question_id を質問のIDに読み替え、初めて聞く質問に選択肢を付ける", () => {
    const record = buildChatTurnRecord({
      rawText: chatOutput({}),
      state,
    });
    expect(JSON.parse(record.content)).toMatchObject({
      text: "ふだんの場面を教えてください。",
      question_id: "q2",
      topic_title: "場面",
      quick_replies: ["思い出せない", "この質問はとばす"],
      stage: "chat",
      next_stage: "chat",
      parse_failed: false,
    });
    expect(record.injected).toEqual({
      resolved_question_id: "q2",
      resolved_topic_title: "場面",
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
    });
    expect(record.injected.next_stage).toBe("summary");
    expect(record.injected.chain_summary).toBe(true);
    expect(record.sessionUpdate).toEqual({ stage: "summary" });
  });

  it("LLM の話題名が空なら null にする", () => {
    const record = buildChatTurnRecord({
      rawText: chatOutput({ topic_title: "  " }),
      state,
    });
    expect(JSON.parse(record.content).topic_title).toBeNull();
    expect(record.injected.resolved_topic_title).toBeNull();
  });

  it("パースに失敗したら本文はそのまま、question_id はコードの値にする", () => {
    const record = buildChatTurnRecord({
      rawText: "壊れた出力",
      state,
    });
    expect(JSON.parse(record.content)).toMatchObject({
      text: "壊れた出力",
      // 読めなかったときは、いまの話題（発話が残っている Q1）を続けたものとする
      question_id: "q1",
      parse_failed: true,
    });
  });
});

describe("buildSummaryTurnRecord", () => {
  it("要約に同意したら完了にする", () => {
    const summaryState = computeSummaryState({
      topics,
      metas: summaryReplyMetas,
      phase: "reply",
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
    expect(record.sessionUpdate).toEqual({ stage: "summary_complete" });
    expect(JSON.parse(record.content).report).toEqual({ summary: "要約" });
  });

  it("インタビューに戻るときは再開の話題を開き、レポートを残さない", () => {
    const summaryState = computeSummaryState({
      topics,
      metas: summaryReplyMetas,
      phase: "reply",
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
      topic_title: "付け足し",
      report: null,
      stage: "summary",
      next_stage: "chat",
    });
    expect(record.sessionUpdate).toEqual({ stage: "chat" });
  });

  it("要約の段階が続くときはセッションを書き戻さない", () => {
    const summaryState = computeSummaryState({
      topics,
      metas,
      phase: "first",
      forceClose: false,
    });
    const record = buildSummaryTurnRecord({
      rawText: JSON.stringify({
        text: "まとめました。",
        summary_response: "none",
        report: { summary: "要約" },
      }),
      summaryState,
    });
    expect(record.injected.next_stage).toBe("summary");
    expect(record.sessionUpdate).toBeNull();
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

describe("readTopicTitle", () => {
  it("空でない文字列だけを前後の空白を除いて使う", () => {
    expect(readTopicTitle({ topic_title: " 場面 " })).toBe("場面");
    expect(readTopicTitle({ topic_title: "" })).toBeNull();
    expect(readTopicTitle({ topic_title: 1 })).toBeNull();
    expect(readTopicTitle(null)).toBeNull();
  });
});
