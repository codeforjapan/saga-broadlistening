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
        participation: { kind: "allowed" },
      })
    ).toEqual({ kind: "link", href: "/interviews/wakamono-shien/chat" });
  });

  it("参加条件を満たさなければアプリからの回答方法の案内にする", () => {
    expect(
      resolveKikaseteStart({
        isOpen: true,
        startHref: "/interviews/wakamono-shien/chat",
        participation: guide,
      })
    ).toEqual({ kind: "guide", participation: guide });
  });

  it("募集中でなければ参加条件に関わらず押せない状態にする", () => {
    for (const participation of [{ kind: "allowed" as const }, guide]) {
      expect(
        resolveKikaseteStart({
          isOpen: false,
          startHref: "/interviews/wakamono-shien/chat",
          participation,
        })
      ).toEqual({ kind: "unavailable" });
    }
  });
});
