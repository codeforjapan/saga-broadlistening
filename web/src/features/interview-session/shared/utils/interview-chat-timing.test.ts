import { buildTurnTopics } from "@mirai-gikai/shared/interview-prompts/turn-control";
import { describe, expect, it } from "vitest";
import {
  createTextFieldDetector,
  formatServerTiming,
  isBedrockOutputEvent,
  measureChatPromptSections,
  summarizeStages,
  summarizeStreamTiming,
} from "./interview-chat-timing";

describe("formatServerTiming", () => {
  it("段階を Server-Timing の形式でつなぐ", () => {
    expect(
      formatServerTiming([
        { name: "auth", durationMs: 12.34 },
        { name: "build-prompt", durationMs: 5 },
      ])
    ).toBe("auth;dur=12.3, build-prompt;dur=5.0");
  });

  it("段階がなければ空文字を返す", () => {
    expect(formatServerTiming([])).toBe("");
  });
});

describe("summarizeStages", () => {
  it("段階名ごとに丸めた時間を返す", () => {
    expect(
      summarizeStages([
        { name: "auth", durationMs: 12.34 },
        { name: "build-prompt", durationMs: 5 },
      ])
    ).toEqual({ auth: 12.3, "build-prompt": 5 });
  });
});

describe("createTextFieldDetector", () => {
  it("ほかのフィールドの後の最初の文字を検出する", () => {
    const detect = createTextFieldDetector();
    expect(detect('{"question_id":"q1","topic_title":"t",')).toBe(false);
    expect(detect('"text":"こ')).toBe(true);
  });

  it("チャンクをまたいだキーを検出する", () => {
    const detect = createTextFieldDetector();
    expect(detect('{"te')).toBe(false);
    expect(detect('xt":')).toBe(false);
    expect(detect('"')).toBe(false);
    expect(detect("こ")).toBe(true);
  });

  it("コロンの前後の空白を許す", () => {
    const detect = createTextFieldDetector();
    expect(detect('{ "text" : "a')).toBe(true);
  });

  it("空の text は最初の文字として扱わない", () => {
    const detect = createTextFieldDetector();
    expect(detect('{"text":"","wrap_up":false}')).toBe(false);
  });

  it("似た名前のキーには反応しない", () => {
    const detect = createTextFieldDetector();
    expect(detect('{"context":"a"')).toBe(false);
  });
});

describe("isBedrockOutputEvent", () => {
  it("テキストとツール入力の差分を出力として扱う", () => {
    expect(
      isBedrockOutputEvent({ contentBlockDelta: { delta: { text: "a" } } })
    ).toBe(true);
    expect(
      isBedrockOutputEvent({
        contentBlockDelta: { delta: { toolUse: { input: '{"a' } } },
      })
    ).toBe(true);
  });

  it("空の差分とほかのイベントは出力として扱わない", () => {
    expect(
      isBedrockOutputEvent({
        contentBlockDelta: { delta: { toolUse: { input: "" } } },
      })
    ).toBe(false);
    expect(isBedrockOutputEvent({ messageStart: { role: "assistant" } })).toBe(
      false
    );
    expect(isBedrockOutputEvent(null)).toBe(false);
    expect(isBedrockOutputEvent("text")).toBe(false);
  });
});

describe("summarizeStreamTiming", () => {
  it("各区間の時間を計算する", () => {
    expect(
      summarizeStreamTiming({
        requestStart: 100,
        llmStart: 400,
        firstToken: 1400,
        firstText: 1600,
        lastToken: 2000,
        responseEnd: 2150.55,
      })
    ).toEqual({
      preprocessMs: 300,
      ttftMs: 1000,
      firstTextMs: 1200,
      generationMs: 600,
      trailingWaitMs: 150.6,
      totalMs: 2050.6,
    });
  });

  it("起きなかった区間は null にする", () => {
    expect(summarizeStreamTiming({ requestStart: 100 })).toEqual({
      preprocessMs: null,
      ttftMs: null,
      firstTextMs: null,
      generationMs: null,
      trailingWaitMs: null,
      totalMs: null,
    });
  });
});

describe("measureChatPromptSections", () => {
  const topics = buildTurnTopics([{ id: "q1", question: "困っていますか？" }]);
  const interviewConfig = { name: "テーマ", description: "説明" };

  it("節ごとの文字数を返す", () => {
    const sections = measureChatPromptSections({
      bill: null,
      interviewConfig,
      topics,
    });

    expect(sections.themeDescription).toBe("説明".length);
    expect(sections.questionsText).toBeGreaterThan(0);
    expect(sections.knowledgeSection).toBeGreaterThan(0);
    expect(sections).not.toHaveProperty("subject");
    expect(sections.relatedPoliciesContent).toBe(0);
  });

  it("関連施策の本文の文字数を合計する", () => {
    const sections = measureChatPromptSections({
      bill: {
        related_policies: [
          { content: "12345" },
          { content: null },
          { content: "678" },
        ],
      },
      interviewConfig,
      topics,
    });

    expect(sections.relatedPoliciesContent).toBe(8);
  });
});
