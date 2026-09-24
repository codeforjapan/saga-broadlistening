import type { JSONValue } from "ai";
import type { AiConfig } from "./config";

/**
 * gpt-oss は reasoning effort で出力の質が大きく変わる。未指定だと
 * 会話履歴との突き合わせが浅く、回答済みの内容を聞き直すなどの問題が出た。
 * 用途（interview / summary など）を問わず、gpt-oss を使う呼び出しすべてに付ける。
 */
const GPT_OSS_REASONING_EFFORT = "medium";

function isGptOssModel(bedrockModelId: string): boolean {
  return bedrockModelId.includes("openai.gpt-oss");
}

/** Bedrock へ渡す providerOptions。付ける設定がなければ undefined を返す */
export function buildBedrockProviderOptions(
  bedrockModelId: string,
  guardrail: AiConfig["guardrail"]
): Record<string, JSONValue> | undefined {
  const options: Record<string, JSONValue> = {
    ...(guardrail ? { guardrailConfig: guardrail } : {}),
    ...(isGptOssModel(bedrockModelId)
      ? { reasoningConfig: { maxReasoningEffort: GPT_OSS_REASONING_EFFORT } }
      : {}),
  };
  return Object.keys(options).length > 0 ? options : undefined;
}
