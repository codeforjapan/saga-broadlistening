import { describe, expect, it } from "vitest";
import { resolveKikaseteStart } from "./kikasete-start";

const guide = {
  kind: "guide" as const,
  themeName: "若者支援",
  providers: [],
};

describe("resolveKikaseteStart", () => {
  it("募集中で参加できればリンクにする", () => {
    expect(
      resolveKikaseteStart({
        isOpen: true,
        startHref: "/interviews/wakamono-shien/chat",
        resultHref: "/interviews/wakamono-shien/summary",
        participation: { kind: "allowed" },
      })
    ).toEqual({ kind: "link", href: "/interviews/wakamono-shien/chat" });
  });

  it("参加条件を満たさなければアプリからの回答方法の案内にする", () => {
    expect(
      resolveKikaseteStart({
        isOpen: true,
        startHref: "/interviews/wakamono-shien/chat",
        resultHref: "/interviews/wakamono-shien/summary",
        participation: guide,
      })
    ).toEqual({ kind: "guide", participation: guide });
  });

  it("募集が終わっていれば、アプリ外から見ていても案内ではなく結果への導線にする", () => {
    for (const participation of [{ kind: "allowed" as const }, guide]) {
      expect(
        resolveKikaseteStart({
          isOpen: false,
          startHref: "/interviews/wakamono-shien/chat",
          resultHref: "/interviews/wakamono-shien/summary",
          participation,
        })
      ).toEqual({
        kind: "result",
        href: "/interviews/wakamono-shien/summary",
      });
    }
  });
});
