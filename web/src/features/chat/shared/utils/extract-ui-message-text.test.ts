import { describe, expect, it } from "vitest";
import { extractUiMessageText } from "./extract-ui-message-text";

describe("extractUiMessageText", () => {
  it("メッセージが無ければ空文字", () => {
    expect(extractUiMessageText(undefined)).toBe("");
    expect(extractUiMessageText({})).toBe("");
  });

  it("テキストパートのみを連結する", () => {
    expect(
      extractUiMessageText({
        parts: [
          { type: "text", text: "こんにちは" },
          { type: "tool-suggest_interview" },
          { type: "text", text: "。質問です" },
        ],
      })
    ).toBe("こんにちは。質問です");
  });

  it("前後の空白は取り除く", () => {
    expect(
      extractUiMessageText({ parts: [{ type: "text", text: "  本文  " }] })
    ).toBe("本文");
  });
});
