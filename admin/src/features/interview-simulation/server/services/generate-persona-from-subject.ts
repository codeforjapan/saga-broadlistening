import "server-only";

import type {
  PromptBillInput,
  InterviewConfig as PromptInterviewConfig,
} from "@mirai-gikai/shared/interview-prompts/types";
import { generateObject, NoObjectGeneratedError } from "ai";
import type { AiModel } from "@/lib/ai/models";
import { LLM_MAX_ATTEMPTS, LLM_TIMEOUT_MS } from "../../shared/constants";
import {
  type PersonaCharacterSheet,
  personaSchema,
} from "../../shared/schemas";
import { buildPersonaPrompt } from "../../shared/utils/build-persona-prompt";
import { withTimeoutRetry } from "../../shared/utils/with-timeout-retry";

interface GeneratePersonaFromSubjectParams {
  /** 対象の施策。抽象テーマ型では null で、テーマの説明だけを材料にする */
  bill: PromptBillInput;
  interviewConfig: PromptInterviewConfig;
  stanceHint?: "for" | "against" | "neutral";
  roleHint?: string;
  model: AiModel;
  traceId: string;
  /** クライアント abort 時に LLM 呼び出しも停止させる */
  signal?: AbortSignal;
}

/**
 * 対象（施策 or テーマ）の内容からシミュ用ペルソナを 1 件生成する。
 * タイムアウト + 自動リトライは withTimeoutRetry ヘルパに委譲。
 */
export async function generatePersonaFromSubject({
  bill,
  interviewConfig,
  stanceHint,
  roleHint,
  model,
  traceId,
  signal,
}: GeneratePersonaFromSubjectParams): Promise<PersonaCharacterSheet> {
  const prompt = buildPersonaPrompt({
    bill,
    interviewConfig,
    stanceHint,
    roleHint,
  });

  try {
    const { object } = await withTimeoutRetry(
      (attemptSignal) =>
        generateObject({
          model,
          schema: personaSchema,
          prompt,
          abortSignal: attemptSignal,
          experimental_telemetry: {
            isEnabled: true,
            // 既存のテレメトリ集計と接続を保つため、ID は施策時代のまま据え置く
            functionId: "sim-generate-persona-from-bill",
            metadata: {
              traceId,
              stanceHint: stanceHint ?? "(none)",
            },
          },
        }),
      {
        externalSignal: signal,
        timeoutMs: LLM_TIMEOUT_MS.persona,
        maxAttempts: LLM_MAX_ATTEMPTS,
        label: "sim-generate-persona-from-subject",
      }
    );

    // stanceHint 指定時は保険として上書き（LLM が無視するケース対策）
    if (stanceHint && object.stance !== stanceHint) {
      object.stance = stanceHint;
    }
    return object;
  } catch (error) {
    // schema 不一致は SDK 側のメッセージだけだと原因が分からないので、
    // 生 text と cause を吐いて次回以降の調査に備える
    if (NoObjectGeneratedError.isInstance(error)) {
      console.warn("[generatePersonaFromSubject] schema mismatch", {
        roleHint,
        stanceHint,
        finishReason: error.finishReason,
        cause: error.cause,
        rawText: error.text?.slice(0, 1000),
      });
    }
    throw error;
  }
}
