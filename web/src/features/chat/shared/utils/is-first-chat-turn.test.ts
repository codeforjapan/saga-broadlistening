import { describe, expect, it } from "vitest";
import { isFirstChatTurn } from "./is-first-chat-turn";

describe("isFirstChatTurn", () => {
  it("利用者の発言がまだ無い場合も1ターン目とみなす", () => {
    expect(isFirstChatTurn([])).toBe(true);
  });

  it("利用者の発言が1件だけなら1ターン目", () => {
    expect(isFirstChatTurn([{ role: "assistant" }, { role: "user" }])).toBe(
      true
    );
  });

  it("利用者の発言が2件以上なら1ターン目ではない", () => {
    expect(
      isFirstChatTurn([
        { role: "user" },
        { role: "assistant" },
        { role: "user" },
      ])
    ).toBe(false);
  });
});
