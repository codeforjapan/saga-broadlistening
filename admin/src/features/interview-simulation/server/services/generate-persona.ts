import "server-only";

import { getAiModel } from "@mirai-gikai/shared/ai/registry";
import { generateObject, type LanguageModel } from "ai";
import { LLM_MAX_ATTEMPTS, LLM_TIMEOUT_MS } from "../../shared/constants";
import {
  type PersonaCharacterSheet,
  personaSchema,
} from "../../shared/schemas";
import type { OriginalInterviewSnapshot } from "../../shared/types";
import { buildPersonaExtractorPrompt } from "../../shared/utils/build-persona-extractor-prompt";
import { withTimeoutRetry } from "../../shared/utils/with-timeout-retry";

interface GeneratePersonaParams {
  original: OriginalInterviewSnapshot;
  model?: LanguageModel;
  traceId: string;
  /** クライアント abort 時に LLM 呼び出しも停止させる */
  signal?: AbortSignal;
}

/**
 * 過去レポートからシミュ用ペルソナを 1 件生成する。
 * タイムアウト + 自動リトライは withTimeoutRetry ヘルパに委譲。
 */
export async function generatePersona({
  original,
  model,
  traceId,
  signal,
}: GeneratePersonaParams): Promise<PersonaCharacterSheet> {
  const prompt = buildPersonaExtractorPrompt(original);

  const { object } = await withTimeoutRetry(
    (attemptSignal) =>
      generateObject({
        ...getAiModel("simulation", model),
        schema: personaSchema,
        prompt,
        abortSignal: attemptSignal,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "sim-extract-persona",
          metadata: {
            traceId,
            reportId: original.reportId,
          },
        },
      }),
    {
      externalSignal: signal,
      timeoutMs: LLM_TIMEOUT_MS.persona,
      maxAttempts: LLM_MAX_ATTEMPTS,
      label: "sim-extract-persona",
    }
  );
  return object;
}
