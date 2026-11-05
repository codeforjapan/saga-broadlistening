import { describe, expect, it } from "vitest";
import { buildInitialTurnVariables } from "./initial-prompt";
import { getPurposeTemplateSteps } from "./purpose-types/registry";
import { buildTurnTopics } from "./turn-control";

describe("buildInitialTurnVariables", () => {
  it("話題の数は言い足しを含むすべての話題", () => {
    const topics = buildTurnTopics(
      getPurposeTemplateSteps("envision", "theme").map((s, i) => ({
        id: `q${i + 1}`,
        ...s,
      }))
    );
    expect(buildInitialTurnVariables(topics)).toEqual({
      topicCount: "5",
      firstQuestion: "佐賀市に住んで（関わって）どのくらいになりますか？",
      firstQuestionId: "Q1",
    });
  });

  it("話題が無ければ汎用の最初の質問にする", () => {
    expect(buildInitialTurnVariables([])).toEqual({
      topicCount: "0",
      firstQuestion: "このテーマについて、思うことを教えてください。",
      firstQuestionId: "Q1",
    });
  });
});
