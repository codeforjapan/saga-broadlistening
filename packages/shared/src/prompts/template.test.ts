import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PUBLIC_PROMPT_CATALOG } from "./catalog";
import { renderPromptTemplate, validatePromptTemplate } from "./template";

const variables = {
  billName: "{{$&}}",
  billTitle: "t",
  billSummary: "s",
  billContent: "c",
};
function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

describe("public prompt templates", () => {
  it("preserves exact prior outputs, including empty and trimmed knowledge", () => {
    expect(hash(renderPromptTemplate("top-chat-system", PUBLIC_PROMPT_CATALOG["top-chat-system"].defaultContent, { ...variables, billSummary: "{{$&}}" }))).toBe("b3af570354cd15f5d7f1f7a2a708b03cfdcb30e2654f7898797cf60d8815a306");
    for (const [key, empty, withKnowledge] of [
      ["bill-chat-system-normal", "7c9b69b8f6e6d08e349669affe9742d85a41b65a3d504c3318f7827c966d85a7", "c4235af5b06b901119d1109c212db0edc9fa3b623dbb4844f0f58f8d7a0025d3"],
      ["bill-chat-system-hard", "2346d7372dca8998cd8fb636049559af40a77992a90b15ee97f65c87e50e9221", "26277065f4d855473b957f3241141b6825503aea589a8f6b305d75e7a8247bd6"],
    ] as const) {
      const content = PUBLIC_PROMPT_CATALOG[key].defaultContent;
      expect(hash(renderPromptTemplate(key, content, variables))).toBe(empty);
      expect(hash(renderPromptTemplate(key, content, { ...variables, knowledgeSource: " \n " }))).toBe(empty);
      expect(hash(renderPromptTemplate(key, content, { ...variables, knowledgeSource: "  {{$&}}  " }))).toBe(withKnowledge);
    }
  });

  it("substitutes in one pass without interpreting replacement tokens", () => {
    const result = renderPromptTemplate("top-chat-system", "{{billSummary}}", { billSummary: "{{billSummary}} $&" });
    expect(result).toBe("{{billSummary}} $&");
  });

  it("rejects missing, unknown, malformed and empty templates", () => {
    expect(validatePromptTemplate("top-chat-system", "")).toEqual(expect.arrayContaining([expect.stringContaining("本文"), expect.stringContaining("billSummary")]));
    expect(validatePromptTemplate("top-chat-system", "{{billSummary}} {{unknown}} {{broken}")).toEqual(expect.arrayContaining([expect.stringContaining("未知"), expect.stringContaining("括弧")]));
    expect(validatePromptTemplate("top-chat-system", "{{{billSummary}}}")).toEqual(
      expect.arrayContaining([expect.stringContaining("括弧")])
    );
    expect(validatePromptTemplate("bill-chat-system-normal", "{{billSummary}}")).toEqual(expect.arrayContaining([expect.stringContaining("knowledgeSourceSection")]));
  });
});

it("recognizes only own catalog keys", async () => {
  const { isPublicPromptKey } = await import("./catalog");
  expect(isPublicPromptKey("top-chat-system")).toBe(true);
  expect(isPublicPromptKey("toString")).toBe(false);
  expect(isPublicPromptKey("constructor")).toBe(false);
});
