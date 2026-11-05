import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAssetSrc } from "./assets";

describe("CHAT_AVATAR_SRC", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("環境変数未設定ならデフォルトを返す", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_CHAT_AVATAR_SRC", "");
    vi.resetModules();
    const { CHAT_AVATAR_SRC } = await import("./assets");
    expect(CHAT_AVATAR_SRC).toBe("/icons/ai-chat.svg");
  });

  it("環境変数が設定されていればそれを返す", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_CHAT_AVATAR_SRC", "/img/city.svg");
    vi.resetModules();
    const { CHAT_AVATAR_SRC } = await import("./assets");
    expect(CHAT_AVATAR_SRC).toBe("/img/city.svg");
  });
});

describe("resolveAssetSrc", () => {
  it("override が指定されていればそれを返す", () => {
    expect(resolveAssetSrc("/img/custom.svg", "/icons/default.svg")).toBe(
      "/img/custom.svg"
    );
  });

  it("override が undefined ならデフォルトを返す", () => {
    expect(resolveAssetSrc(undefined, "/icons/default.svg")).toBe(
      "/icons/default.svg"
    );
  });

  it("override が空文字ならデフォルトを返す", () => {
    expect(resolveAssetSrc("", "/icons/default.svg")).toBe(
      "/icons/default.svg"
    );
  });

  it("override が空白のみならデフォルトを返す", () => {
    expect(resolveAssetSrc("   ", "/icons/default.svg")).toBe(
      "/icons/default.svg"
    );
  });

  it("override の前後の空白は除去される", () => {
    expect(resolveAssetSrc(" /img/custom.svg ", "/icons/default.svg")).toBe(
      "/img/custom.svg"
    );
  });

  it("外部URLはデフォルトにフォールバックする", () => {
    expect(
      resolveAssetSrc("https://evil.example/a.svg", "/icons/default.svg")
    ).toBe("/icons/default.svg");
  });

  it("プロトコル相対URL（//host）はデフォルトにフォールバックする", () => {
    expect(
      resolveAssetSrc("//evil.example/a.svg", "/icons/default.svg")
    ).toBe("/icons/default.svg");
  });

  it("相対パスはデフォルトにフォールバックする", () => {
    expect(resolveAssetSrc("img/custom.svg", "/icons/default.svg")).toBe(
      "/icons/default.svg"
    );
  });
});
