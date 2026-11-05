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

/**
 * Opus 5.5 は思考が常時有効で、AI SDK が構造化出力に使う tool_choice 強制
 * （type "tool" / "any"）を拒否する。AI SDK の auto 判定ではネイティブ構造化出力を
 * 選ばないため、明示的に outputFormat（output_config.format）を使わせる。
 * @ai-sdk/amazon-bedrock 4.0.176 時点の回避策。SDK が Opus 5.5 を
 * "claude-opus-5" の前方一致で非対応扱いしなくなったら削除する。
 */
function requiresNativeStructuredOutput(bedrockModelId: string): boolean {
  return bedrockModelId.includes("anthropic.claude-opus-5-5");
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
    ...(requiresNativeStructuredOutput(bedrockModelId)
      ? { structuredOutputMode: "outputFormat" }
      : {}),
  };
  return Object.keys(options).length > 0 ? options : undefined;
}
