import { isKnownModel } from "@mirai-gikai/shared/ai/models";
import { describe, expect, it } from "vitest";
import {
  CHAT_MODEL_GROUPS,
  CHAT_MODEL_OPTIONS,
  DEFAULT_MODEL_LABEL,
  isValidChatModel,
} from "./chat-model-options";

describe("CHAT_MODEL_OPTIONS", () => {
  it("全てのオプションがプロバイダーを識別できるvalueを持つ", () => {
    for (const option of CHAT_MODEL_OPTIONS) {
      expect(option.value).toMatch(/^(bedrock:|(openai|google|anthropic)\/)/);
    }
  });

  // UI で選べるモデルは必ず AI_MODELS（isKnownModel）のサブセットであること。
  // ここが崩れると、UI で選べるのに backfill dispatch が「未知のモデルID」で
  // 400 を返す乖離が起きる。
  it("全てのオプションが AI_MODELS に登録済み（isKnownModel=true）", () => {
    for (const option of CHAT_MODEL_OPTIONS) {
      expect(isKnownModel(option.value)).toBe(true);
    }
  });

  it("全てのオプションがラベルを持つ", () => {
    for (const option of CHAT_MODEL_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("重複するvalueがない", () => {
    const values = CHAT_MODEL_OPTIONS.map((opt) => opt.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("CHAT_MODEL_GROUPS", () => {
  it("Bedrockと既存Gatewayモデルのグループが存在する", () => {
    expect(CHAT_MODEL_GROUPS).toHaveLength(4);
    expect(CHAT_MODEL_GROUPS.map((g) => g.provider)).toEqual([
      "Amazon Bedrock",
      "OpenAI",
      "Google",
      "Anthropic",
    ]);
  });

  it("全グループのモデル数がフラット一覧と一致する", () => {
    const groupTotal = CHAT_MODEL_GROUPS.reduce(
      (sum, g) => sum + g.options.length,
      0
    );
    expect(groupTotal).toBe(CHAT_MODEL_OPTIONS.length);
  });

  it("選択肢には確認済みの推定料金を表示する", () => {
    for (const group of CHAT_MODEL_GROUPS) {
      for (const option of group.options) {
        expect(option.estimatedCost).not.toBeNull();
        expect(option.estimatedCost).toMatch(/^~\d+円$/);
      }
    }
  });
});

describe("isValidChatModel", () => {
  it("有効なモデルIDに対してtrueを返す", () => {
    expect(isValidChatModel("openai/gpt-4o-mini")).toBe(true);
    expect(isValidChatModel("google/gemini-3-flash")).toBe(true);
    expect(isValidChatModel("anthropic/claude-sonnet-4.6")).toBe(true);
  });

  it("無効なモデルIDに対してfalseを返す", () => {
    expect(isValidChatModel("invalid-model")).toBe(false);
    expect(isValidChatModel("openai/nonexistent")).toBe(false);
    expect(isValidChatModel("")).toBe(false);
  });
});

it("環境設定に依存する既定モデルに固定のモデル名や料金を表示しない", () => {
  expect(DEFAULT_MODEL_LABEL).toBe("環境の既定モデル");
});

it.each([
  "bedrock:jp.anthropic.claude-sonnet-4-6",
  "bedrock:arn:aws:bedrock:ap-northeast-1:123456789012:application-inference-profile/example",
  "openai:custom-model",
  "google:gemini-custom",
  "gateway:custom/new-model",
])("カタログ外でもプロバイダー指定が有効なら受け付ける: %s", (model) => {
  expect(isValidChatModel(model)).toBe(true);
});
