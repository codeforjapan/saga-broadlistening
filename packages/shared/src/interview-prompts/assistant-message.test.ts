import { describe, expect, it } from "vitest";
import {
  collectAssistantTurnMetas,
  findSelectedQuickReply,
  matchQuickReply,
  readAssistantQuickReplies,
} from "./assistant-message";

describe("collectAssistantTurnMetas", () => {
  it("assistant 発話の question_id とステージを読む", () => {
    expect(
      collectAssistantTurnMetas([
        {
          role: "assistant",
          content: '{"text":"a","question_id":"q1","stage":"chat"}',
        },
        { role: "user", content: "答え" },
        {
          role: "assistant",
          content: '{"text":"b","question_id":"q1"}',
        },
        { role: "assistant", content: '{"text":"c","stage":"summary"}' },
        { role: "assistant", content: "旧形式のテキスト" },
      ])
    ).toEqual([
      { questionId: "q1", stage: "chat" },
      { questionId: "q1", stage: null },
      { questionId: null, stage: "summary" },
      { questionId: null, stage: null },
    ]);
  });

  it("知らないステージの値は null にする", () => {
    expect(
      collectAssistantTurnMetas([
        { role: "assistant", content: '{"text":"a","stage":"unknown"}' },
      ])
    ).toEqual([{ questionId: null, stage: null }]);
  });
});

describe("readAssistantQuickReplies", () => {
  it("保存した発話の選択肢ボタンを読む", () => {
    expect(
      readAssistantQuickReplies(
        '{"text":"a","quick_replies":["自分が","この質問はとばす"]}'
      )
    ).toEqual(["自分が", "この質問はとばす"]);
  });

  it("選択肢が無い・読めない発話は空にする", () => {
    expect(readAssistantQuickReplies('{"text":"a"}')).toEqual([]);
    expect(readAssistantQuickReplies('{"quick_replies":"自分が"}')).toEqual(
      []
    );
    expect(readAssistantQuickReplies("旧形式のテキスト")).toEqual([]);
  });
});

describe("matchQuickReply", () => {
  it("回答が選択肢の文言そのものなら、その選択肢を返す", () => {
    expect(matchQuickReply(["自分が", "家族が"], " 自分が\n")).toBe("自分が");
  });

  it("選択肢に続けて書き足した回答は、選択肢とみなさない", () => {
    expect(matchQuickReply(["自分が"], "自分が通っています")).toBeNull();
  });

  it("回答が空なら null", () => {
    expect(matchQuickReply(["自分が"], "  ")).toBeNull();
    expect(matchQuickReply(["自分が"], undefined)).toBeNull();
  });
});

describe("findSelectedQuickReply", () => {
  const question = {
    role: "assistant",
    content: '{"text":"関わりはありますか？","quick_replies":["自分が","家族が"]}',
  };

  it("末尾の回答が直前の発話の選択肢なら、その選択肢を返す", () => {
    expect(
      findSelectedQuickReply([question, { role: "user", content: "家族が" }])
    ).toBe("家族が");
  });

  it("末尾が回答でなければ null", () => {
    expect(
      findSelectedQuickReply([
        question,
        { role: "user", content: "家族が" },
        { role: "assistant", content: '{"text":"そうなんですね"}' },
      ])
    ).toBeNull();
  });

  it("前の発話の選択肢とは照らし合わせない", () => {
    expect(
      findSelectedQuickReply([
        question,
        { role: "user", content: "家族が" },
        { role: "assistant", content: '{"text":"どんなことですか？"}' },
        { role: "user", content: "自分が" },
      ])
    ).toBeNull();
  });
});
