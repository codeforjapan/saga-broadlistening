import { describe, expect, it } from "vitest";
import { PENDING_UID_FRAGMENT_WINDOW_KEY } from "../constants";
import { buildEarlyCaptureScript } from "./early-capture-script";

/** 最小限の window を作ってスクリプトを評価する */
function runScript(hash: string) {
  const win: Record<string, unknown> = {};
  const replaced: string[] = [];
  const fn = new Function(
    "window",
    "location",
    "history",
    "URLSearchParams",
    buildEarlyCaptureScript()
  );
  fn(
    win,
    { hash, pathname: "/interviews/x", search: "?a=1" },
    {
      state: null,
      replaceState: (_s: unknown, _t: string, url: string) =>
        replaced.push(url),
    },
    URLSearchParams
  );
  return { pending: win[PENDING_UID_FRAGMENT_WINDOW_KEY], replaced };
}

describe("buildEarlyCaptureScript", () => {
  it("#uid= を退避して URL から除去する", () => {
    const { pending, replaced } = runScript("#uid=abc-123");
    expect(pending).toBe("#uid=abc-123");
    expect(replaced).toEqual(["/interviews/x?a=1"]);
  });

  it("他のフラグメントパラメータは残す", () => {
    const { replaced } = runScript("#uid=abc&foo=bar");
    expect(replaced).toEqual(["/interviews/x?a=1#foo=bar"]);
  });

  it("uid が無ければ何もしない", () => {
    for (const hash of ["#chat-log", "#foo=bar", ""]) {
      const { pending, replaced } = runScript(hash);
      expect(pending).toBeUndefined();
      expect(replaced).toEqual([]);
    }
  });
});
