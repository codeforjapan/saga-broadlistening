import { describe, expect, it } from "vitest";
import { buildInitialTurnVariables } from "./initial-prompt";
import { getPurposeTemplateSteps } from "./purpose-types/registry";
import { buildTurnTopics } from "./turn-control";

describe("buildInitialTurnVariables", () => {
  it("最初の話題の質問を渡し、話題の数は渡さない", () => {
    const topics = buildTurnTopics(
      getPurposeTemplateSteps("envision", "theme").map((s, i) => ({
        id: `q${i + 1}`,
        ...s,
      }))
    );
    expect(buildInitialTurnVariables(topics)).toEqual({
      firstQuestion: "佐賀市に住んで（関わって）どのくらいになりますか？",
    });
  });

  it("話題が無ければ汎用の最初の質問にする", () => {
    expect(buildInitialTurnVariables([])).toEqual({
      firstQuestion: "このテーマについて、思うことを教えてください。",
    });
  });
});
