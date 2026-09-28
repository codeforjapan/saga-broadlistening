import { PUBLIC_PROMPT_CATALOG, isPublicPromptKey, type PublicPromptKey } from "./catalog";
import { renderPromptTemplate, validatePromptTemplate } from "./template";

export interface PublishedPromptReader {
  findPublishedPrompt(key: PublicPromptKey): Promise<{ content: string } | null>;
}

export interface CompiledPublicPrompt {
  content: string;
  metadata: string;
}

export class PublicPromptProvider {
  constructor(
    private readonly reader: PublishedPromptReader,
    private readonly onFallback: (key: PublicPromptKey) => void = () => {}
  ) {}

  async getPrompt(
    key: string,
    variables: Record<string, string> = {}
  ): Promise<CompiledPublicPrompt> {
    if (!isPublicPromptKey(key)) throw new Error(`Unknown public prompt: ${key}`);
    // Caller mistakes must fail even if the database is unavailable.
    renderPromptTemplate(key, PUBLIC_PROMPT_CATALOG[key].defaultContent, variables);
    let template: string | null = null;
    let source: "database" | "source-code" = "database";
    try {
      template = (await this.reader.findPublishedPrompt(key))?.content ?? null;
    } catch {
      template = null;
    }
    if (template === null || validatePromptTemplate(key, template).length > 0) {
      this.onFallback(key);
      source = "source-code";
      template = PUBLIC_PROMPT_CATALOG[key].defaultContent;
    }
    return {
      content: renderPromptTemplate(key, template, variables),
      metadata: JSON.stringify({ source, name: key }),
    };
  }
}
