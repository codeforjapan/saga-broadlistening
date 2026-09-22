import { describe, expect, it } from "vitest";
import {
  getAllowedChatModelGroups,
  isValidChatModel,
} from "./chat-model-options";

describe("接続先ごとのモデル選択", () => {
  it("4つのprovider groupを接続経路で区別する", () => {
    expect(
      getAllowedChatModelGroups(["bedrock", "gateway", "openai", "google"]).map(
        (x) => x.provider
      )
    ).toEqual([
      "Amazon Bedrock",
      "Vercel AI Gateway",
      "OpenAI（直接接続）",
      "Google（直接接続）",
    ]);
  });
  it("BedrockのみならGatewayの候補を含めない", () => {
    const groups = getAllowedChatModelGroups(["bedrock"]);
    expect(groups).toHaveLength(1);
    expect(groups[0].options.map((x) => x.label)).toEqual([
      "Claude Sonnet 4.6",
      "Claude Haiku 4.5",
      "Claude Opus 4.8",
      "GPT OSS 120B",
    ]);
  });
  it("直接接続の料金が未設定ならGatewayの概算を流用しない", () => {
    const option = getAllowedChatModelGroups(["openai", "gateway"])
      .flatMap((x) => x.options)
      .find((x) => x.value === "openai:gpt-5.2");
    expect(option?.estimatedCost).toBeNull();
  });
  it("直接接続の料金設定からインタビューの概算を表示する", () => {
    const groups = getAllowedChatModelGroups(["openai"], {
      "openai:gpt-5.2": {
        inputTokensPerMillionUsd: 2,
        outputTokensPerMillionUsd: 10,
      },
    });
    expect(
      groups[0].options.find((x) => x.value === "openai:gpt-5.2")?.estimatedCost
    ).toBe("~30円");
  });
  it("Bedrockの上書き料金も概算へ反映する", () => {
    const groups = getAllowedChatModelGroups(["bedrock"], {
      "bedrock:jp.anthropic.claude-sonnet-4-6": {
        inputTokensPerMillionUsd: 0,
        outputTokensPerMillionUsd: 0,
      },
    });
    expect(groups[0].options[0].estimatedCost).toBe("~1円");
  });
});

describe("モデルIDの検証", () => {
  it.each([
    "openai/gpt-4o-mini",
    "bedrock:jp.anthropic.claude-sonnet-4-6",
    "google:custom",
    "gateway:custom/new-model",
  ])("許可リスト未指定なら既存のID検証を維持する: %s", (id) => {
    expect(isValidChatModel(id)).toBe(true);
  });
  it.each([
    "invalid",
    "",
    "openai/nonexistent",
  ])("不正なIDを拒否する: %s", (id) => {
    expect(isValidChatModel(id, ["gateway"])).toBe(false);
  });
  it("同じモデルでも接続経路が許可されていなければ拒否する", () => {
    expect(isValidChatModel("openai:gpt-5.2", ["openai"])).toBe(true);
    expect(isValidChatModel("openai/gpt-5.2", ["openai"])).toBe(false);
    expect(isValidChatModel("gateway:openai/gpt-5.2", ["gateway"])).toBe(true);
  });
});
