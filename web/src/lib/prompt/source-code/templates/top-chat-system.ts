import { PUBLIC_PROMPT_CATALOG } from "@mirai-gikai/shared/prompts/catalog";
import { renderPromptTemplate } from "@mirai-gikai/shared/prompts/template";

export function buildTopChatSystemPrompt(billSummary: string): string {
  return renderPromptTemplate(
    "top-chat-system",
    PUBLIC_PROMPT_CATALOG["top-chat-system"].defaultContent,
    { billSummary }
  );
}
