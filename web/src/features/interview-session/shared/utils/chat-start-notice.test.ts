import { describe, expect, it } from "vitest";
import {
  buildChatStartNotice,
  MAX_CHAT_START_NOTICE_LINES,
} from "./chat-start-notice";

const plain = (lines: ReturnType<typeof buildChatStartNotice>) =>
  lines.map((line) => line.map((segment) => segment.text).join(""));

describe("buildChatStartNotice", () => {
  it("案内は3行以内に収める", () => {
    expect(
      buildChatStartNotice({ themeName: "若者支援", estimatedDuration: 10 })
        .length
    ).toBeLessThanOrEqual(MAX_CHAT_START_NOTICE_LINES);
  });

  it("テーマ名と所要時間、公開の可能性と個人情報の注意を伝える", () => {
    expect(
      plain(
        buildChatStartNotice({ themeName: "若者支援", estimatedDuration: 10 })
      )
    ).toEqual([
      "こんにちは。「若者支援」について、約10分お話を伺います。",
      "いただいた回答は、整理したうえで公開されることがあります。お名前や連絡先など、個人がわかる情報は書かないでください。",
      "準備ができたら「はじめる」を押してください。",
    ]);
  });

  it("テーマ名はリンク、公開の可能性は強調として持つ", () => {
    const [first, second] = buildChatStartNotice({
      themeName: "若者支援",
      estimatedDuration: 10,
    });
    expect(first).toContainEqual({ kind: "theme", text: "若者支援" });
    expect(second).toContainEqual({
      kind: "strong",
      text: "公開されることがあります",
    });
  });

  it("所要時間がなければ時間に触れない", () => {
    expect(
      plain(
        buildChatStartNotice({ themeName: "若者支援", estimatedDuration: null })
      )[0]
    ).toBe("こんにちは。「若者支援」について、お話を伺います。");
  });
});
