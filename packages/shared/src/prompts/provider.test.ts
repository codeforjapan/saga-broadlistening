import { describe, expect, it } from "vitest";
import { PromptProvider } from "./provider";

const variables = { billSummary: "summary" };

describe("PromptProvider", () => {
  it("uses a published database template", async () => {
    const provider = new PromptProvider({ findPublishedPrompt: async () => ({ content: "Published: {{billSummary}}" }) });
    await expect(provider.getPrompt("top-chat-system", variables)).resolves.toEqual({
      content: "Published: summary",
      metadata: JSON.stringify({ source: "database", name: "top-chat-system" }),
    });
  });

  it.each(["missing", "error", "invalid"])("falls back on %s", async (condition) => {
    const fallbacks: string[] = [];
    const provider = new PromptProvider({
      findPublishedPrompt: async () => {
        if (condition === "error") throw new Error("DB text is secret");
        return condition === "invalid" ? { content: "{{unknown}}" } : null;
      },
    }, (key) => fallbacks.push(key));
    const result = await provider.getPrompt("top-chat-system", variables);
    expect(result.content).toContain("summary");
    expect(JSON.parse(result.metadata).source).toBe("source-code");
    expect(fallbacks).toEqual(["top-chat-system"]);
  });

  it("rejects missing variables before database lookup", async () => {
    let queried = false;
    const provider = new PromptProvider({ findPublishedPrompt: async () => { queried = true; return null; } });
    await expect(provider.getPrompt("top-chat-system", {})).rejects.toThrow("Missing required variables");
    expect(queried).toBe(false);
  });
});
