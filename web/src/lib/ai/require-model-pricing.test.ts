import { describe, expect, it } from "vitest";
import { requireModelPricing } from "./require-model-pricing";

describe("requireModelPricing", () => {
  it("料金未登録の直接接続を無料と扱わず呼出前に拒否する", () => {
    expect(() => requireModelPricing("google:custom-model", {})).toThrow(
      "AI_MODEL_PRICING"
    );
  });
  it("明示的な単価設定があれば任意モデルを使用できる", () => {
    expect(() =>
      requireModelPricing("google:custom-model", {
        "google:custom-model": {
          inputTokensPerMillionUsd: 2,
          outputTokensPerMillionUsd: 8,
        },
      })
    ).not.toThrow();
  });
  it("標準Bedrockモデルは確認済みの価格で使用できる", () => {
    expect(() =>
      requireModelPricing("bedrock:jp.anthropic.claude-sonnet-4-6", {})
    ).not.toThrow();
  });
});
