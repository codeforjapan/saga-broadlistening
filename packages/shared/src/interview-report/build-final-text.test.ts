import { describe, expect, it } from "vitest";
import { buildFinalText } from "./build-final-text";

describe("buildFinalText", () => {
  it("見出しの下に、トピックを番号付きで並べる", () => {
    expect(
      buildFinalText({
        summary: "若い人が実家を出られるくらいの収入があってほしい",
        opinions: [
          {
            title: "収入が独立の壁になっている",
            content: "給料が低く、実家を出られない若者が身近にいる。",
          },
          {
            title: "結婚を考える前の不安",
            content: "暮らしの基盤がないと、結婚まで考えられない。",
          },
        ],
      })
    ).toBe(
      [
        "若い人が実家を出られるくらいの収入があってほしい",
        "1. 収入が独立の壁になっている\n給料が低く、実家を出られない若者が身近にいる。",
        "2. 結婚を考える前の不安\n暮らしの基盤がないと、結婚まで考えられない。",
      ].join("\n\n")
    );
  });

  it("トピックが無ければ見出しだけにする", () => {
    expect(
      buildFinalText({ summary: "  特に困っていることはない  ", opinions: [] })
    ).toBe("特に困っていることはない");
  });

  it("中身が空のトピックは数えずに番号を詰める", () => {
    expect(
      buildFinalText({
        summary: "見出し",
        opinions: [
          { title: "", content: " " },
          { title: "タイトルだけ", content: "" },
        ],
      })
    ).toBe("見出し\n\n1. タイトルだけ");
  });
});
