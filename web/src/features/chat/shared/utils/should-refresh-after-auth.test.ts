import { describe, expect, it } from "vitest";
import { shouldRefreshAfterAuth } from "./should-refresh-after-auth";

describe("shouldRefreshAfterAuth", () => {
  it("認証がまだ確立していなければ再描画しない", () => {
    expect(shouldRefreshAfterAuth(null, undefined)).toBe(false);
    expect(shouldRefreshAfterAuth("user-1", undefined)).toBe(false);
  });

  it("初回訪問（サーバー側に利用者がいない）では、認証確立後に再描画する", () => {
    expect(shouldRefreshAfterAuth(null, "user-1")).toBe(true);
  });

  it("サーバーが同じ利用者で描画していれば再描画しない", () => {
    expect(shouldRefreshAfterAuth("user-1", "user-1")).toBe(false);
  });

  it("セッションが入れ替わっていれば再描画する", () => {
    expect(shouldRefreshAfterAuth("user-1", "user-2")).toBe(true);
  });
});
