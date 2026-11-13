import { describe, expect, it } from "vitest";
import { appendSavedMessage } from "./append-saved-message";

const older = { id: "m1", content: "前の発話" };
const saved = { id: "m2", content: "いま保存した発話" };

describe("appendSavedMessage", () => {
  it("一覧に無い保存した発話を末尾に足す", () => {
    expect(appendSavedMessage([older], saved)).toEqual([older, saved]);
  });

  it("一覧に保存した発話が含まれていても重複させない", () => {
    expect(appendSavedMessage([older, saved], saved)).toEqual([older, saved]);
  });

  it("保存しなかったときは一覧をそのまま返す", () => {
    expect(appendSavedMessage([older], null)).toEqual([older]);
  });
});
