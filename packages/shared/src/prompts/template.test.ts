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
    expect(hash(renderPromptTemplate("top-chat-system", PUBLIC_PROMPT_CATALOG["top-chat-system"].defaultContent, { ...variables, billSummary: "{{$&}}" }))).toBe("99fc02070061717b676273dbee01faf55083b1ea216c926b86db055aa0edc121");
    for (const [key, empty, withKnowledge] of [
      ["bill-chat-system-normal", "a1920e378a84e31d952bbb4fe5d71afb2f64495cae3a082e6802d0cef8f0ae4d", "d8d7f9a1bd8af12019c8a2338ed5e121a729d9c2b4d1eded1f61c859b339082b"],
      ["bill-chat-system-hard", "b040308152d271c0ce955708f9f945861469a53be78fbf32536a24a956e54e20", "69afccd9a69a0d1707b206bba91844a5d49778063dfdd39de441800671a6e4a7"],
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
