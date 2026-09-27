import "server-only";
import {
  PublicPromptProvider,
  type PublishedPromptReader,
} from "@mirai-gikai/shared/prompts/provider";
import { findPublishedPrompt } from "@mirai-gikai/shared/prompts/repository";
import { CompositePromptProvider } from "./composite/composite-prompt-provider";
import type { PromptProvider } from "./interface/prompt-provider";
import { getLangfuseClient } from "./langfuse/client";
import { LangfusePromptProvider } from "./langfuse/langfuse-prompt-provider";
import { SOURCE_CODE_PROMPT_NAMES } from "./source-code/source-code-prompt-provider";

/**
 * プロンプトプロバイダーの作成処理
 *
 * 全チャットプロンプト（top-chat-system, bill-chat-system-normal, bill-chat-system-hard）は
 * 公開DB版から取得し、未公開または取得失敗時はコード版を使う。
 * それ以外のプロンプトはLangfusePromptProviderにフォールバックする。
 */
export function createPromptProvider(
  reader: PublishedPromptReader = { findPublishedPrompt }
): PromptProvider {
  const sourceCodeProvider = new PublicPromptProvider(reader, (key) =>
    console.warn(`[Prompts] Using code fallback for ${key}`)
  );

  return new CompositePromptProvider(
    sourceCodeProvider,
    () => {
      const client = getLangfuseClient();
      return new LangfusePromptProvider(client);
    },
    SOURCE_CODE_PROMPT_NAMES
  );
}

export type { PromptProvider } from "./interface/prompt-provider";
export type { CompiledPrompt, PromptVariables } from "./interface/types";
