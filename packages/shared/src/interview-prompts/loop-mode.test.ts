import { describe, expect, it } from "vitest";
import { buildLoopModeSystemPrompt } from "./loop-mode";

const prompt = buildLoopModeSystemPrompt({
  bill: null,
  interviewConfig: { name: "公園の改善" },
  questions: [
    { id: "question-1", question: "公園へのご意見は？", quick_replies: null },
  ],
  currentStage: "chat",
  askedQuestionIds: new Set(),
});

describe("チャット出力の必須nullableフィールド", () => {
  it("選択肢がない場合もquick_repliesを省略せず空配列にする", () => {
    expect(prompt).toContain(
      "選択肢がない場合も、`quick_replies` は省略せず空配列 []"
    );
  });

  it("深掘り時のquestion_idを省略するよう指示しない", () => {
    expect(prompt).toContain("`question_id` は省略せず null");
    expect(prompt).not.toContain("`question_id` を含めない");
    expect(prompt).not.toContain("`question_id` は不要");
  });

  it("深掘り時のtopic_titleを省略するよう指示しない", () => {
    expect(prompt).toContain("`topic_title` は省略せず null");
    expect(prompt).not.toContain("`topic_title` を含めない");
  });
});
