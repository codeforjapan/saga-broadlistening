import "server-only";
import { PromptProvider } from "./provider";
import { findPublishedPrompt } from "./repository";

const provider = new PromptProvider({ findPublishedPrompt }, (key) => {
  console.warn("Language guide fallback", { key, source: "source-code" });
});

/** 中立的な言葉づかいの公開版。公開版が無い・取得できないときはコードの初期文面 */
export async function getPublishedLanguageGuide(): Promise<string> {
  return (await provider.getTemplate("interview-language-guide")).content;
}
