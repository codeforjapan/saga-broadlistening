import type { JSONValue } from "ai";
import type { AiConfig, AiModelPurpose } from "./config";

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

/**
 * @ai-sdk/amazon-bedrock は Sonnet 4.6 と Haiku 4.5 で JSON ツール方式を既定にする。
 * この方式では JSON 全体が最後に一度に届き、本文が出るのは生成が終わってからになる。
 * インタビューの chat（と最初の質問）は平坦なスキーマで outputFormat でも守れたので、
 * 本文を少しずつ届けるためにこの用途だけ outputFormat を使う（#240）。
 * 要約は入れ子のスキーマで未検証のため、SDK の既定のままにする。
 */
const STREAMING_STRUCTURED_OUTPUT_MODELS = [
  "anthropic.claude-sonnet-4-6",
  "anthropic.claude-haiku-4-5",
];

function prefersStreamingStructuredOutput(
  bedrockModelId: string,
  purpose: AiModelPurpose
): boolean {
  return (
    purpose === "interview" &&
    STREAMING_STRUCTURED_OUTPUT_MODELS.some((model) =>
      bedrockModelId.includes(model)
    )
  );
}

/** Bedrock へ渡す providerOptions。付ける設定がなければ undefined を返す */
export function buildBedrockProviderOptions(
  bedrockModelId: string,
  guardrail: AiConfig["guardrail"],
  purpose: AiModelPurpose
): Record<string, JSONValue> | undefined {
  const options: Record<string, JSONValue> = {
    ...(guardrail ? { guardrailConfig: guardrail } : {}),
    ...(isGptOssModel(bedrockModelId)
      ? { reasoningConfig: { maxReasoningEffort: GPT_OSS_REASONING_EFFORT } }
      : {}),
    ...(requiresNativeStructuredOutput(bedrockModelId) ||
    prefersStreamingStructuredOutput(bedrockModelId, purpose)
      ? { structuredOutputMode: "outputFormat" }
      : {}),
  };
  return Object.keys(options).length > 0 ? options : undefined;
}
