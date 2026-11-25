import "server-only";
import { PromptProvider } from "../prompts/provider";
import { appendLanguageGuide } from "../prompts/language-guide";
import { getPublishedLanguageGuide } from "../prompts/published-language-guide";
import { findPublishedPrompt } from "../prompts/repository";
import { buildChatSystemPrompt } from "./chat-prompt";
import { buildInitialSystemPrompt } from "./initial-prompt";
import { buildSummarySystemPrompt } from "./summary";

const provider = new PromptProvider({ findPublishedPrompt }, (key) => {
  console.warn("Interview prompt fallback", { key, source: "source-code" });
});

/**
 * 聞き手の人物像と中立的な言葉づかい（どちらも公開版）。対話・初回・要約の先頭に同じものを入れる
 */
export async function getPublishedInterviewPersona(): Promise<string> {
  const [persona, languageGuide] = await Promise.all([
    provider.getTemplate("interview-persona"),
    getPublishedLanguageGuide(),
  ]);
  return appendLanguageGuide(persona.content, languageGuide);
}

type WithoutPersona<T> = Omit<T, "persona">;

/** 対話のプロンプトの材料（テンプレートと人物像）。セッションや発話に依存しない */
export interface InterviewChatPromptParts {
  template: string;
  persona: string;
}

/**
 * 対話のプロンプトの材料を公開版から取る。前処理と並べて先に取りにいけるよう分けている。
 * 取得に失敗してもコードの初期文面に切り替わるので、reject しない
 */
export async function loadPublishedInterviewPromptParts(): Promise<InterviewChatPromptParts> {
  const [template, persona] = await Promise.all([
    provider.getTemplate("interview-chat-system"),
    getPublishedInterviewPersona(),
  ]);
  return { template: template.content, persona };
}

export async function buildPublishedInterviewPrompt(
  input: WithoutPersona<Parameters<typeof buildChatSystemPrompt>[0]>,
  parts?: InterviewChatPromptParts
): Promise<string> {
  const { template, persona } =
    parts ?? (await loadPublishedInterviewPromptParts());
  return buildChatSystemPrompt({ ...input, persona }, template);
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

/** persona を渡すと、先に取った人物像を使い回す */
export async function buildPublishedSummaryPrompt(
  input: WithoutPersona<Parameters<typeof buildSummarySystemPrompt>[0]>,
  persona?: string
): Promise<string> {
  const [template, resolvedPersona] = await Promise.all([
    provider.getTemplate("interview-summary-system"),
    persona ?? getPublishedInterviewPersona(),
  ]);
  return buildSummarySystemPrompt(
    { ...input, persona: resolvedPersona },
    template.content
  );
}
