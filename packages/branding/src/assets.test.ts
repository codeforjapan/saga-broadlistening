import { describe, expect, it } from "vitest";
import { CHAT_AVATAR_SRC, resolveAssetSrc } from "./assets";
import { BRAND_CONFIG } from "./brand.config";

describe("CHAT_AVATAR_SRC", () => {
  it("brand.config.ts で指定したアバターを使う", () => {
    expect(CHAT_AVATAR_SRC).toBe(
      BRAND_CONFIG.assets.chatAvatarSrc ?? "/icons/ai-chat.svg"
    );
  });
});

describe("resolveAssetSrc", () => {
  it("override が指定されていればそれを返す", () => {
    expect(resolveAssetSrc("/img/custom.svg", "/icons/default.svg")).toBe(
      "/img/custom.svg"
    );
  });

  it("override が null ならデフォルトを返す", () => {
    expect(resolveAssetSrc(null, "/icons/default.svg")).toBe(
      "/icons/default.svg"
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
