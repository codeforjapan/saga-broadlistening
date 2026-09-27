import { PUBLIC_PROMPT_CATALOG } from "@mirai-gikai/shared/prompts/catalog";
import { renderPromptTemplate } from "@mirai-gikai/shared/prompts/template";

export function buildBillChatSystemNormalPrompt(
  billName: string,
  billTitle: string,
  billSummary: string,
  billContent: string,
  knowledgeSource = ""
): string {
  return renderPromptTemplate(
    "bill-chat-system-normal",
    PUBLIC_PROMPT_CATALOG["bill-chat-system-normal"].defaultContent,
    { billName, billTitle, billSummary, billContent, knowledgeSource }
  );
}
