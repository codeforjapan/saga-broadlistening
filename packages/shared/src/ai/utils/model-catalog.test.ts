import { describe, expect, it } from "vitest";
import { AI_MODELS } from "../models";
import { parseModelId } from "../config";
import { getAllowedModelOptions, getModelLabel } from "./model-catalog";

describe("利用者向けモデル名", () => {
  it.each([
    [AI_MODELS.bedrock_sonnet_4_6, "Claude Sonnet 4.6"],
    [AI_MODELS.bedrock_haiku_4_5, "Claude Haiku 4.5"],
    [AI_MODELS.bedrock_gpt_oss_120b, "GPT OSS 120B"],
    ["openai/gpt-5.2", "GPT-5.2"],
    ["gateway:openai/gpt-5.2", "GPT-5.2"],
    ["openai:gpt-5.2", "GPT-5.2"],
    ["google:gemini-3-flash", "Gemini 3 Flash"],
  ])("接続経路を含むIDを表示名に変換する: %s", (id, label) => {
    expect(getModelLabel(id)).toBe(label);
  });
  it("カタログ外のプロファイルを別モデルと誤表示せず、内部IDを公開しない", () => {
    expect(
      getModelLabel(
        "bedrock:arn:aws:bedrock:ap-northeast-1:123456789012:application-inference-profile/custom"
      )
    ).toBe("カスタムモデル");
  });
});

describe("許可された接続先の選択肢", () => {
  it("Bedrockだけなら日本向けの3モデルを返す", () => {
    expect(getAllowedModelOptions(["bedrock"]).map((x) => x.value)).toEqual([
      AI_MODELS.bedrock_sonnet_4_6,
      AI_MODELS.bedrock_haiku_4_5,
      AI_MODELS.bedrock_gpt_oss_120b,
    ]);
  });
  it("OpenAI直接接続だけならGatewayへルーティングするIDを返さない", () => {
    const options = getAllowedModelOptions(["openai"]);
    expect(options.map((x) => x.value)).toContain("openai:gpt-5.2");
    expect(
      options.every((x) => parseModelId(x.value).provider === "openai")
    ).toBe(true);
  });
  it("Google直接接続をGatewayとは独立に選べる", () => {
    const options = getAllowedModelOptions(["google"]);
    expect(options.map((x) => x.value)).toContain("google:gemini-3-flash");
    expect(
      options.every((x) => parseModelId(x.value).provider === "google")
    ).toBe(true);
  });
  it("Gatewayと直接接続を併用してもIDが衝突しない", () => {
    const options = getAllowedModelOptions([
      "gateway",
      "openai",
      "google",
      "bedrock",
    ]);
    const ids = options.map((x) => x.value);
    expect(ids).toContain("openai/gpt-5.2");
    expect(ids).toContain("openai:gpt-5.2");
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("重複した許可プロバイダーから選択肢を重複生成しない", () => {
    expect(getAllowedModelOptions(["bedrock", "bedrock"])).toEqual(
      getAllowedModelOptions(["bedrock"])
    );
  });
  it("許可プロバイダーが空なら選択肢も空", () => {
    expect(getAllowedModelOptions([])).toEqual([]);
  });
});
