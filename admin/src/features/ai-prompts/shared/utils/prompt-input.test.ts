import { PUBLIC_PROMPT_CATALOG } from "@mirai-gikai/shared/prompts/catalog";
import { describe, expect, it } from "vitest";
import {
  previewPromptSchema,
  publishPromptSchema,
  savePromptSchema,
} from "./prompt-input";

describe("prompt inputs", () => {
  it("rejects inherited property names as prompt keys", () => {
    expect(
      savePromptSchema.safeParse({
        key: "toString",
        content: "a",
        changeNote: "reason",
        expectedRevision: 0,
      }).success
    ).toBe(false);
  });

  it("validates required variables and reason before saving", () => {
    expect(
      savePromptSchema.safeParse({
        key: "top-chat-system",
        content: "hello",
        changeNote: " ",
        expectedRevision: 0,
      }).success
    ).toBe(false);
    expect(
      savePromptSchema.safeParse({
        key: "top-chat-system",
        content: PUBLIC_PROMPT_CATALOG["top-chat-system"].defaultContent,
        changeNote: "初版",
        expectedRevision: 0,
      }).success
    ).toBe(true);
  });

  it("requires a saved version and reason for publication", () => {
    expect(
      publishPromptSchema.safeParse({
        key: "top-chat-system",
        versionId: "bad",
        changeNote: " ",
        expectedRevision: 0,
      }).success
    ).toBe(false);
  });

  it("requires a bill only for bill previews", () => {
    expect(
      previewPromptSchema.safeParse({
        key: "top-chat-system",
        content: PUBLIC_PROMPT_CATALOG["top-chat-system"].defaultContent,
      }).success
    ).toBe(true);
    expect(
      previewPromptSchema.safeParse({
        key: "bill-chat-system-normal",
        content:
          PUBLIC_PROMPT_CATALOG["bill-chat-system-normal"].defaultContent,
      }).success
    ).toBe(false);
  });
});

it("インタビュー本文を保存し、プレビューには募集の選択を要求する", () => {
  const content =
    "方針 {{summarySection}} {{themeDescription}} {{conversationLog}} {{reportInstructions}}";
  expect(
    savePromptSchema.safeParse({
      key: "interview-summary-system",
      content,
      changeNote: "初版",
      expectedRevision: 0,
    }).success
  ).toBe(true);
  expect(
    previewPromptSchema.safeParse({ key: "interview-summary-system", content })
      .success
  ).toBe(false);
  expect(
    previewPromptSchema.safeParse({
      key: "interview-summary-system",
      content,
      interviewConfigId: "00000000-0000-4000-8000-000000000001",
    }).success
  ).toBe(true);
});
