/**
 * インタビューチャットで選択可能なAIモデルの定義
 * Bedrock の選択肢と既存の AI Gateway モデル
 */

import { AI_MODELS } from "@mirai-gikai/shared/ai/models";
import { isValidModelId } from "@mirai-gikai/shared/ai/validate-model-id";
import {
  estimateInterviewCostUsd,
  formatEstimatedCost,
} from "./estimate-interview-cost";

type ChatModelOption = {
  value: string;
  label: string;
  estimatedCost: string | null;
};

export type ChatModelGroup = {
  provider: string;
  options: ChatModelOption[];
};

const BEDROCK_MODELS = [
  { value: AI_MODELS.bedrock_sonnet_4_6, label: "Claude Sonnet 4.6" },
  { value: AI_MODELS.bedrock_haiku_4_5, label: "Claude Haiku 4.5" },
  { value: AI_MODELS.bedrock_gpt_oss_120b, label: "GPT OSS 120B" },
] as const;

const OPENAI_MODELS = [
  { value: "openai/gpt-4o-mini", label: "GPT-4o mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "openai/gpt-5-mini", label: "GPT-5 mini" },
  { value: "openai/gpt-5-nano", label: "GPT-5 nano" },
  { value: "openai/gpt-5.1-thinking", label: "GPT-5.1 Thinking" },
  { value: "openai/gpt-5.2", label: "GPT-5.2" },
  { value: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { value: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { value: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna" },
] as const;

const GOOGLE_MODELS = [
  { value: "google/gemini-3-flash", label: "Gemini 3 Flash" },
  { value: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  {
    value: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
  },
  { value: "google/gemma-4-26b-a4b-it", label: "Gemma 4 26B A4B (MoE)" },
] as const;

const ANTHROPIC_MODELS = [
  { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { value: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  { value: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5" },
  { value: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6" },
] as const;

/** フラットなモデル一覧（選択肢表示用） */
export const CHAT_MODEL_OPTIONS = [
  ...BEDROCK_MODELS,
  ...OPENAI_MODELS,
  ...GOOGLE_MODELS,
  ...ANTHROPIC_MODELS,
] as const;

export type ChatModelValue = (typeof CHAT_MODEL_OPTIONS)[number]["value"];

function buildGroupOptions(
  models: ReadonlyArray<{ value: string; label: string }>
): ChatModelOption[] {
  return models.map((m) => {
    const cost = estimateInterviewCostUsd(m.value);
    return {
      value: m.value,
      label: m.label,
      estimatedCost: cost !== null ? formatEstimatedCost(cost) : null,
    };
  });
}

/** プロバイダー別にグループ化されたモデル一覧（UI表示用） */
export const CHAT_MODEL_GROUPS: ChatModelGroup[] = [
  { provider: "Amazon Bedrock", options: buildGroupOptions(BEDROCK_MODELS) },
  { provider: "OpenAI", options: buildGroupOptions(OPENAI_MODELS) },
  { provider: "Google", options: buildGroupOptions(GOOGLE_MODELS) },
  { provider: "Anthropic", options: buildGroupOptions(ANTHROPIC_MODELS) },
];

/** 文字列が有効なチャットモデルIDかどうかを検証する */
export function isValidChatModel(model: string): boolean {
  return isValidModelId(model);
}

/** 実行環境で変わるため、特定モデル名・料金は表示しない。 */
export const DEFAULT_MODEL_LABEL = "環境の既定モデル";
