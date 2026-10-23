import "server-only";
import { PromptProvider } from "../prompts/provider";
import { findPublishedPrompt } from "../prompts/repository";
import { buildChatSystemPrompt } from "./chat-prompt";
import { buildInitialSystemPrompt } from "./initial-prompt";
import { buildSummarySystemPrompt } from "./summary";

const provider = new PromptProvider({ findPublishedPrompt }, (key) => {
  console.warn("Interview prompt fallback", { key, source: "source-code" });
});

/** 聞き手の人物像（公開版）。対話・初回・要約の先頭に同じものを入れる */
export async function getPublishedInterviewPersona(): Promise<string> {
  return (await provider.getTemplate("interview-persona")).content;
}

type WithoutPersona<T> = Omit<T, "persona">;

export async function buildPublishedInterviewPrompt(
  input: WithoutPersona<Parameters<typeof buildChatSystemPrompt>[0]>
): Promise<string> {
  const [template, persona] = await Promise.all([
    provider.getTemplate("interview-chat-system"),
    getPublishedInterviewPersona(),
  ]);
  return buildChatSystemPrompt({ ...input, persona }, template.content);
}

export async function buildPublishedInitialPrompt(
  input: WithoutPersona<Parameters<typeof buildInitialSystemPrompt>[0]>
): Promise<string> {
  const [template, persona] = await Promise.all([
    provider.getTemplate("interview-initial-system"),
    getPublishedInterviewPersona(),
  ]);
  return buildInitialSystemPrompt({ ...input, persona }, template.content);
}

export async function buildPublishedSummaryPrompt(
  input: WithoutPersona<Parameters<typeof buildSummarySystemPrompt>[0]>
): Promise<string> {
  const [template, persona] = await Promise.all([
    provider.getTemplate("interview-summary-system"),
    getPublishedInterviewPersona(),
  ]);
  return buildSummarySystemPrompt({ ...input, persona }, template.content);
}
