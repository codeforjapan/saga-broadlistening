import { describe, expect, it } from "vitest";
import { isHttpUrl } from "./is-http-url";

describe("isHttpUrl", () => {
  it("http / https の絶対URLを受け付ける", () => {
    expect(isHttpUrl("https://www.city.saga.lg.jp/")).toBe(true);
    expect(isHttpUrl("http://example.jp/path?q=1")).toBe(true);
  });

  it("他のスキーム・相対パス・URLでない文字列を拒否する", () => {
    for (const value of [
      "javascript:alert(1)",
      "ftp://example.jp",
      "/relative",
      "example",
      "",
    ]) {
      expect(isHttpUrl(value), value).toBe(false);
    }
  });
});
