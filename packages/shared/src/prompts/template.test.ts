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
    expect(hash(renderPromptTemplate("top-chat-system", PUBLIC_PROMPT_CATALOG["top-chat-system"].defaultContent, { ...variables, billSummary: "{{$&}}" }))).toBe("d454cd447d3668bc479a01dacbff2d5bc943cc0952b8e673da2c2be2979003ca");
    for (const [key, empty, withKnowledge] of [
      ["bill-chat-system-normal", "b8a7976c2906ae07d69ef7f4998de13bf7f7337477cd64453f76ce65fd89d40d", "472ea9daad959f995932d1ae4b9240571f6f6216d601924aad70fd62e015c86c"],
      ["bill-chat-system-hard", "969338c8929dee29f48f5987cb617980704a1f666a365877b25fec7fde7aef77", "c5f1ff64d9fdf668f95a4e8facd3dc4e76a3ba6ee15a0bc39481492001e414bd"],
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
