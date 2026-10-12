import { describe, expect, it } from "vitest";
import { buildInitialTurnVariables } from "./initial-prompt";
import { getPurposeTemplateSteps } from "./purpose-types/registry";
import { buildTurnTopics } from "./turn-control";

describe("buildInitialTurnVariables", () => {
  it("全体像は関わり・言い足しを除いた必須の話題、数は言い足しを含む必須の話題", () => {
    const topics = buildTurnTopics(
      getPurposeTemplateSteps("envision", "theme").map((s, i) => ({
        id: `q${i + 1}`,
        ...s,
      })),
      { purposeType: "envision", subject: "theme" }
    );
    expect(buildInitialTurnVariables(topics)).toEqual({
      topicCount: "5",
      topicOutline: "よかった場面、10年後の一日、遠ざけているもの",
      firstQuestion: "佐賀市に住んで（関わって）どのくらいになりますか？",
      firstQuestionId: "Q1",
    });
  });

  it("話題が無ければ汎用の最初の質問にする", () => {
    expect(buildInitialTurnVariables([])).toEqual({
      topicCount: "0",
      topicOutline: "いくつかの話題",
      firstQuestion: "このテーマについて、思うことを教えてください。",
      firstQuestionId: "Q1",
    });
  });
});
