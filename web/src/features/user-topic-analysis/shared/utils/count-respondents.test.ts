import { describe, expect, it } from "vitest";
import type { PublicOpinion, PublicTopic } from "../types";
import { countTopicRespondents } from "./count-respondents";

function op(opinionId: string): PublicOpinion {
  return {
    id: `op-${Math.random()}`,
    opinion_id: opinionId,
    opinion_public: true,
    created_at: null,
    title: "t",
    content: "c",
    role_title: null,
    contextual_quote: null,
    richness: null,
    source_message_id: null,
    question_snippet: null,
  };
}

function topic(id: string, opinions: PublicOpinion[]): PublicTopic {
  return {
    id,
    title: id,
    description: "",
    opinion_count: opinions.length,
    opinions,
  };
}

describe("countTopicRespondents", () => {
  it("トピック横断で出典意見IDをユニークに数える", () => {
    const topics = [
      topic("a", [op("o1"), op("o2"), op("o2")]),
      topic("b", [op("o2"), op("o3")]),
    ];
    // o1, o2, o3 → 3
    expect(countTopicRespondents(topics)).toBe(3);
  });

  it("空なら0", () => {
    expect(countTopicRespondents([])).toBe(0);
  });
});
