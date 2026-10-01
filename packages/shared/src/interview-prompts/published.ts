import "server-only";
import { PromptProvider } from "../prompts/provider";
import { findPublishedPrompt } from "../prompts/repository";
import { buildLoopModeSystemPrompt } from "./loop-mode";
import { buildSummarySystemPrompt } from "./summary";

const provider = new PromptProvider({ findPublishedPrompt }, (key) => {
  console.warn("Interview prompt fallback", { key, source: "source-code" });
});

export async function buildPublishedInterviewPrompt(
  input: Parameters<typeof buildLoopModeSystemPrompt>[0]
): Promise<string> {
  const template = await provider.getTemplate("interview-chat-system");
  return buildLoopModeSystemPrompt(input, template.content);
}

export async function buildPublishedSummaryPrompt(
  input: Parameters<typeof buildSummarySystemPrompt>[0]
): Promise<string> {
  const template = await provider.getTemplate("interview-summary-system");
  return buildSummarySystemPrompt(input, template.content);
}
