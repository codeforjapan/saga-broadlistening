import { AI_PROMPT_CATALOG, isPromptKey, type PromptKey } from "./catalog";
import { renderPromptTemplate, validatePromptTemplate } from "./template";

export interface PublishedPromptReader {
  findPublishedPrompt(key: PromptKey): Promise<{ content: string } | null>;
}

export interface CompiledPrompt {
  content: string;
  metadata: string;
}

export class PromptProvider {
  constructor(
    private readonly reader: PublishedPromptReader,
    private readonly onFallback: (key: PromptKey) => void = () => {}
  ) {}

  async getPrompt(
    key: string,
    variables: Record<string, string> = {}
  ): Promise<CompiledPrompt> {
    if (!isPromptKey(key)) throw new Error(`Unknown public prompt: ${key}`);
    // Caller mistakes must fail even if the database is unavailable.
    renderPromptTemplate(key, AI_PROMPT_CATALOG[key].defaultContent, variables);
    const template = await this.getTemplate(key);
    return {
      content: renderPromptTemplate(key, template.content, variables),
      metadata: template.metadata,
    };
  }

  async getTemplate(key: PromptKey): Promise<CompiledPrompt> {
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
      template = AI_PROMPT_CATALOG[key].defaultContent;
    }
    return {
      content: template,
      metadata: JSON.stringify({ source, name: key }),
    };
  }
}
