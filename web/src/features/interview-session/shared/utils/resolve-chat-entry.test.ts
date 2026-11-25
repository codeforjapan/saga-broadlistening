import { describe, expect, it } from "vitest";
import { resolveChatEntry } from "./resolve-chat-entry";

describe("resolveChatEntry", () => {
  it("進行中のセッションがなければ開始画面", () => {
    expect(resolveChatEntry(null)).toEqual({ kind: "start" });
  });

  it("同意済みの進行中セッションは続きから", () => {
    const session = { id: "s1", consented_at: "2026-10-13T00:00:00Z" };
    expect(resolveChatEntry(session)).toEqual({ kind: "resume", session });
  });

  it("同意の記録がない古い進行中セッションも続きから", () => {
    const session = { id: "s2", consented_at: null };
    expect(resolveChatEntry(session)).toEqual({ kind: "resume", session });
  });
});
