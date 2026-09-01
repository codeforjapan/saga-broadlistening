import type { ContentBlock } from "@aws-sdk/client-bedrock-runtime";
import { describe, expect, it } from "vitest";
import { extractReplyText } from "./extract-reply-text";

describe("extractReplyText", () => {
  it("textブロックからテキストを取り出す", () => {
    const content: ContentBlock = { text: "ok" };

    expect(extractReplyText(content)).toBe("ok");
  });

  it("contentがundefinedの場合はundefinedを返す", () => {
    expect(extractReplyText(undefined)).toBeUndefined();
  });

  it("textを持たないブロックの場合はundefinedを返す", () => {
    const content = {
      image: { format: "png", source: {} },
    } as ContentBlock;

    expect(extractReplyText(content)).toBeUndefined();
  });
});
