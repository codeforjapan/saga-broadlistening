import { describe, expect, it } from "vitest";
import { createPromptProvider } from "./index";

describe("createPromptProvider", () => {
  it("uses a published database template through the production provider", async () => {
    const provider = createPromptProvider({
      findPublishedPrompt: async () => ({ content: "DB: {{billSummary}}" }),
    });
    const result = await provider.getPrompt("top-chat-system", {
      billSummary: "施策",
    });
    expect(result.content).toBe("DB: 施策");
    expect(JSON.parse(result.metadata)).toEqual({
      source: "database",
      name: "top-chat-system",
    });
  });

  it("uses the code template when the published body is invalid", async () => {
    const provider = createPromptProvider({
      findPublishedPrompt: async () => ({ content: "{{unknown}}" }),
    });
    const result = await provider.getPrompt("top-chat-system", {
      billSummary: "施策",
    });
    expect(result.content).toContain("施策");
    expect(JSON.parse(result.metadata).source).toBe("source-code");
  });
});
