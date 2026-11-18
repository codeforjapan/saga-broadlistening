import { describe, expect, it } from "vitest";
import { parseCost, resolveCostUsd } from "./cost-utils";

describe("parseCost", () => {
  it("正常な数値をそのまま返す", () => {
    expect(parseCost({ cost_usd: 0.123456 })).toBe(0.123456);
  });

  it("0を正しく返す", () => {
    expect(parseCost({ cost_usd: 0 })).toBe(0);
  });

  it("nullなら0を返す", () => {
    expect(parseCost({ cost_usd: null })).toBe(0);
  });

  it("NaNなら0を返す", () => {
    expect(parseCost({ cost_usd: Number.NaN as number })).toBe(0);
  });

  it("Infinityなら0を返す", () => {
    expect(parseCost({ cost_usd: Number.POSITIVE_INFINITY as number })).toBe(0);
  });
});

describe("resolveCostUsd", () => {
  const zeroUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  const someUsage = { inputTokens: 100, outputTokens: 50, totalTokens: 150 };

  it("costOverrideが有限数値ならroundCostされた値を返す", () => {
    const result = resolveCostUsd("any-model", zeroUsage, 0.001);
    expect(result).toBe(0.001);
  });

  it("costOverrideがNaNなら無視して次のフォールバックへ", () => {
    const result = resolveCostUsd("any-model", zeroUsage, Number.NaN);
    expect(result).toBe(0);
  });

  it("costOverrideがnullなら無視して計算へフォールバック", () => {
    expect(() => resolveCostUsd("unknown-model", someUsage, null)).toThrow(
      "Unknown pricing"
    );
  });

  it("costOverrideがundefinedならトークンベース計算へフォールバック", () => {
    expect(() => resolveCostUsd("unknown-model", someUsage)).toThrow(
      "Unknown pricing"
    );
  });

  it("トークンが0でoverrideもなければ0を返す", () => {
    expect(resolveCostUsd("any-model", zeroUsage)).toBe(0);
  });
});

describe("Web検索料金", () => {
  const usage = { inputTokens: 100, outputTokens: 50, totalTokens: 150 };
  const pricing = {
    "openai:gpt-5-mini": {
      inputTokensPerMillionUsd: 0.25,
      outputTokensPerMillionUsd: 2,
    },
    "openai:gpt-4o-mini": {
      inputTokensPerMillionUsd: 0.15,
      outputTokensPerMillionUsd: 0.6,
    },
  };
  it("直接接続では検索回数分をトークン料金に加算する", () => {
    expect(
      resolveCostUsd("openai:gpt-5-mini", usage, undefined, pricing, 2)
    ).toBe(0.020125);
  });
  it("実費が取得できた場合は検索料金を重複加算しない", () => {
    expect(
      resolveCostUsd("gateway:openai/gpt-5-mini", usage, 0.034, undefined, 2)
    ).toBe(0.034);
  });
  it("4o-miniの検索入力固定ブロックを概算に含める", () => {
    expect(
      resolveCostUsd("openai:gpt-4o-mini", usage, undefined, pricing, 1)
    ).toBe(0.011245);
  });
  it("検索ONでも実際に検索しなければ追加料金はない", () => {
    expect(
      resolveCostUsd("openai:gpt-5-mini", usage, undefined, pricing, 0)
    ).toBe(0.000125);
  });
  it("Gatewayの実費が欠落しても検索を無料扱いしない", () => {
    expect(
      resolveCostUsd(
        "gateway:openai/gpt-5-mini",
        usage,
        undefined,
        undefined,
        1
      )
    ).toBe(0.010125);
  });
});
