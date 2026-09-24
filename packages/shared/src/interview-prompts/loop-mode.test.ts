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

describe("1ターン1問の指示", () => {
  it("1つのメッセージに複数の質問を重ねるよう指示しない", () => {
    expect(prompt).not.toContain("追加の質問を2〜3問重ねて");
    expect(prompt).toContain("質問を**1つだけ**してください");
  });

  it("2つのことを並べて聞いたり、気持ちを名詞で聞いたりしないよう指示する", () => {
    expect(prompt).toContain("2つのことを並べて一度に聞かない");
    expect(prompt).toContain("「どう感じましたか？」");
  });

  it("受け止めと質問1つの順で返答を組み立てさせる", () => {
    expect(prompt).toContain("## 返答（text）の組み立て方");
    expect(prompt).toContain("## 話題の移り方");
  });
});

describe("深掘りの打ち切り基準", () => {
  const billPrompt = buildLoopModeSystemPrompt({
    bill: { name: "学校給食の無償化" },
    interviewConfig: { name: "給食" },
    questions: [],
    currentStage: "chat",
    askedQuestionIds: new Set(),
  });

  it("テーマ型では日常のエピソードを打ち切りのサインにしない", () => {
    expect(prompt).not.toContain("施策の論点から離れた");
    expect(prompt).not.toContain("もしこの施策が実施されたら");
    expect(prompt).toContain("日常の具体的なエピソードや気持ちそのもの");
  });

  it("返答の例は対象に合わせて出し分ける", () => {
    expect(prompt).toContain("同世代で集まれる場がほとんどない");
    expect(billPrompt).not.toContain("同世代で集まれる場がほとんどない");
    expect(billPrompt).toContain("給食費が毎月の負担になっている");
  });

  it("施策型では施策の論点から離れたら打ち切る", () => {
    expect(billPrompt).toContain("施策の論点から離れた");
    expect(billPrompt).toContain("もしこの施策が実施されたら");
  });
});
