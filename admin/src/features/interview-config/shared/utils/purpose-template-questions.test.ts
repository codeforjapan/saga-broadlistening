import { describe, expect, it } from "vitest";
import { buildPurposeTemplateQuestions } from "./purpose-template-questions";

describe("buildPurposeTemplateQuestions", () => {
  it("確かめる×施策では5問が入り、4問目の選択肢の最後が「まだ決められない」", () => {
    const questions = buildPurposeTemplateQuestions("verify", "bill");
    expect(questions).toHaveLength(5);
    expect(questions[3].quick_replies?.at(-1)).toBe("まだ決められない");
  });

  it("観点・選択肢がない話題は未指定にする", () => {
    const questions = buildPurposeTemplateQuestions("verify", "bill");
    // Q3（案による変化）は選択肢なし、Q5（言い足し）は観点なし
    expect(questions[2].quick_replies).toBeUndefined();
    expect(questions[4].follow_up_guide).toBeUndefined();
  });

  it("テーマ型では対象に合わせたテンプレートを返す", () => {
    expect(buildPurposeTemplateQuestions("verify", "theme")).toHaveLength(4);
  });
});
