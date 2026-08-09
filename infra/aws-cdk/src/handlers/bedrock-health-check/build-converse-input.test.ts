import { describe, expect, it } from "vitest";
import { buildHealthCheckConverseInput } from "./build-converse-input";
import { extractReplyText } from "./extract-reply-text";

describe("buildHealthCheckConverseInput", () => {
  it("指定したmodelIdでConverseCommand用の入力を組み立てる", () => {
    const input = buildHealthCheckConverseInput(
      "anthropic.claude-3-5-sonnet-20241022-v2:0"
    );

    expect(input.modelId).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");

    const messages = input.messages ?? [];
    expect(messages).toHaveLength(1);

    const [message] = messages;
    expect(message?.role).toBe("user");
    expect(extractReplyText(message?.content?.[0])).toContain("ok");
  });
});
