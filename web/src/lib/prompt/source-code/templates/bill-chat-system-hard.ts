import { PUBLIC_PROMPT_CATALOG } from "@mirai-gikai/shared/prompts/catalog";
import { renderPromptTemplate } from "@mirai-gikai/shared/prompts/template";

export function buildBillChatSystemHardPrompt(
  billName: string,
  billTitle: string,
  billSummary: string,
  billContent: string,
  knowledgeSource = ""
): string {
  return renderPromptTemplate(
    "bill-chat-system-hard",
    PUBLIC_PROMPT_CATALOG["bill-chat-system-hard"].defaultContent,
    { billName, billTitle, billSummary, billContent, knowledgeSource }
  );
}
