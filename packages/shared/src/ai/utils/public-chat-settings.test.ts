import { parseAiConfig } from "./config";
import { describe, expect, it } from "vitest";
import {
  publicChatSettingsSchema,
  resolveDefaultPublicChatModel,
  supportsPublicChatWebSearch,
  validatePublicChatModel,
} from "./public-chat-settings";

describe("公開チャット設定", () => {
  it("未設定なら環境のモデルを使い、検索はOFFになる", () => {
    expect(publicChatSettingsSchema.parse({})).toEqual({
      chat_model: null,
      web_search_enabled: false,
      allowed_domains: [],
    });
  });
  it("許可ドメインを正規化し重複を除去する", () => {
    expect(
      publicChatSettingsSchema.parse({
        allowed_domains: [
          " CITY.SAGA.LG.JP ",
          "city.saga.lg.jp",
          "pref.saga.lg.jp",
        ],
      }).allowed_domains
    ).toEqual(["city.saga.lg.jp", "pref.saga.lg.jp"]);
  });
  it.each([
    "https://city.saga.lg.jp",
    "*.saga.lg.jp",
    "city.saga.lg.jp/path",
    "city.saga.lg.jp:443",
    "localhost",
    "127.0.0.1",
    "-city.saga.lg.jp",
    "city..lg.jp",
    "city.saga.lg.jp@evil.com",
  ])("ドメイン以外の指定を拒否する: %s", (domain) => {
    expect(
      publicChatSettingsSchema.safeParse({ allowed_domains: [domain] }).success
    ).toBe(false);
  });
  it("検索ONでは許可ドメインを必須とする", () => {
    expect(
      publicChatSettingsSchema.safeParse({ web_search_enabled: true }).success
    ).toBe(false);
  });
  it("検索OFFでも許可ドメインを保持する", () => {
    expect(
      publicChatSettingsSchema.parse({
        web_search_enabled: false,
        allowed_domains: ["city.saga.lg.jp"],
      }).allowed_domains
    ).toEqual(["city.saga.lg.jp"]);
  });
  it.each([
    "openai:gpt-4o",
    "gateway:openai/gpt-5-mini",
    "openai/gpt-5.2",
  ])("対応モデルは検索可能: %s", (model) => {
    expect(supportsPublicChatWebSearch(model)).toBe(true);
  });
  it.each([
    "bedrock:jp.anthropic.claude-sonnet-4-6",
    "gateway:anthropic/claude-sonnet-4.6",
    "google:gemini-3-flash",
    "openai:gpt-5-nano",
    "openai:unknown",
    "invalid",
  ])("非対応モデルでは検索不可: %s", (model) => {
    expect(supportsPublicChatWebSearch(model)).toBe(false);
  });
  it("検索ON時の非対応モデルをサーバーでも拒否する", () => {
    const settings = publicChatSettingsSchema.parse({
      web_search_enabled: true,
      allowed_domains: ["city.saga.lg.jp"],
    });
    expect(() =>
      validatePublicChatModel(
        settings,
        "bedrock:jp.anthropic.claude-sonnet-4-6"
      )
    ).toThrow();
    expect(() =>
      validatePublicChatModel(settings, "openai:gpt-4o")
    ).not.toThrow();
  });
  it("モデルIDとドメイン数の不正を拒否する", () => {
    expect(
      publicChatSettingsSchema.safeParse({ chat_model: "bad model" }).success
    ).toBe(false);
    expect(
      publicChatSettingsSchema.safeParse({
        allowed_domains: Array.from(
          { length: 101 },
          (_, i) => `site${i}.example.com`
        ),
      }).success
    ).toBe(false);
  });
});

it("環境の既定値が非対応でも明示モデルを選び直せる状態を返す", () => {
  expect(
    resolveDefaultPublicChatModel(
      parseAiConfig({ AI_ALLOWED_PROVIDERS: "openai" })
    )
  ).toBeNull();
  expect(
    resolveDefaultPublicChatModel(
      parseAiConfig({
        AI_ALLOWED_PROVIDERS: "openai",
        AI_CHAT_MODEL: "openai:gpt-5",
      })
    )
  ).toBe("openai:gpt-5");
});
