import { describe, expect, it } from "vitest";
import { supportsWebSearch } from "./supports-web-search";

describe("supportsWebSearch", () => {
  it.each([
    ["openai:gpt-4o", true],
    ["gateway:openai/gpt-4o", true],
    ["gateway:anthropic/claude-sonnet-4.6", false],
    ["bedrock:openai.gpt-oss-120b-1:0", false],
    ["bedrock:jp.anthropic.claude-sonnet-4-6", false],
    ["google:gemini-2.5-flash", false],
  ])("%s の経路でOpenAI専用ツールの送信可否を判断する", (id, expected) => {
    expect(supportsWebSearch(id)).toBe(expected);
  });
});
