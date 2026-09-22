import { describe, expect, it } from "vitest";
import {
  buildLangfuseProcessorOptions,
  LANGFUSE_DEFAULT_BASE_URL,
  resolveLangfuseBaseUrl,
} from "./langfuse-base-url";

describe("resolveLangfuseBaseUrl", () => {
  it("既定は日本リージョンで、EUへは倒さない", () => {
    // トレースに意見本文が乗るため、設定漏れで国外へ送らないことが要件
    expect(LANGFUSE_DEFAULT_BASE_URL).toBe("https://jp.cloud.langfuse.com");
    expect(resolveLangfuseBaseUrl()).toBe(LANGFUSE_DEFAULT_BASE_URL);
  });

  it("空文字・空白のみの設定値も既定へ倒す", () => {
    expect(resolveLangfuseBaseUrl("")).toBe(LANGFUSE_DEFAULT_BASE_URL);
    expect(resolveLangfuseBaseUrl("   ")).toBe(LANGFUSE_DEFAULT_BASE_URL);
  });

  it("明示された接続先はそのまま使う", () => {
    expect(resolveLangfuseBaseUrl("https://langfuse.example.jp")).toBe(
      "https://langfuse.example.jp"
    );
    expect(resolveLangfuseBaseUrl("  http://127.0.0.1:3000  ")).toBe(
      "http://127.0.0.1:3000"
    );
  });
});

describe("buildLangfuseProcessorOptions", () => {
  it("baseUrl 未設定なら日本リージョンへ送る", () => {
    // spread の順序が崩れると SDK 既定の EU へ黙って送られるため、ここで固定する
    const options = buildLangfuseProcessorOptions({
      publicKey: "pk-lf-test",
      secretKey: "sk-lf-test",
    });
    expect(options.baseUrl).toBe(LANGFUSE_DEFAULT_BASE_URL);
  });

  it("明示された baseUrl は spread に潰されず残る", () => {
    const options = buildLangfuseProcessorOptions({
      publicKey: "pk-lf-test",
      secretKey: "sk-lf-test",
      baseUrl: "http://127.0.0.1:3000",
      environment: "preview",
    });
    expect(options.baseUrl).toBe("http://127.0.0.1:3000");
    expect(options.environment).toBe("preview");
    expect(options.publicKey).toBe("pk-lf-test");
  });

  it("v4 ingestion ヘッダーを必ず付ける", () => {
    // 付いていないと Langfuse 側の反映が最大15分遅延する
    expect(
      buildLangfuseProcessorOptions({}).additionalHeaders
    ).toEqual({ "x-langfuse-ingestion-version": "4" });
  });
});
