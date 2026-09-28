import { PUBLIC_PROMPT_CATALOG, type PublicPromptKey } from "./catalog";
import { buildKnowledgeSourceSection } from "./knowledge-source-section";

const PLACEHOLDER = /\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g;
const BILL_VARIABLES = ["billName", "billTitle", "billSummary", "billContent"];

export function validatePromptTemplate(
  key: PublicPromptKey,
  content: string
): string[] {
  const errors: string[] = [];
  if (!content.trim()) errors.push("本文を入力してください。");
  if (content.length > 100000) errors.push("本文は100000文字以内にしてください。");
  const found = new Set<string>();
  for (const match of content.matchAll(PLACEHOLDER)) {
    found.add(match[1]);
  }
  for (const variable of PUBLIC_PROMPT_CATALOG[key].requiredVariables) {
    if (!found.has(variable)) errors.push(`必須変数 {{${variable}}} がありません。`);
  }
  const allowed = new Set<string>(PUBLIC_PROMPT_CATALOG[key].requiredVariables);
  for (const variable of found) {
    if (!allowed.has(variable)) errors.push(`未知の変数 {{${variable}}} があります。`);
  }
  const remainder = content.replace(PLACEHOLDER, "");
  if (
    remainder.includes("{{") ||
    remainder.includes("}}") ||
    /\{\{\{|\}\}\}/.test(content)
  ) {
    errors.push("変数の括弧が不正です。{{変数名}} の形式で入力してください。");
  }
  return errors;
}

export function renderPromptTemplate(
  key: PublicPromptKey,
  content: string,
  variables: Record<string, string>
): string {
  const required = key === "top-chat-system" ? ["billSummary"] : BILL_VARIABLES;
  const missing = required.filter((variable) =>
    key === "top-chat-system"
      ? !variables[variable]
      : !Object.hasOwn(variables, variable)
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required variables for prompt "${key}": ${missing.join(", ")}`
    );
  }
  const knowledgeSourceSection = buildKnowledgeSourceSection(
    variables.knowledgeSource ?? ""
  );
  const values: Record<string, string> = {
    ...variables,
    knowledgeSourceSection,
  };
  return content.replace(PLACEHOLDER, (_match, variable: string) =>
    Object.hasOwn(values, variable) ? values[variable] : ""
  );
}

export { buildKnowledgeSourceSection } from "./knowledge-source-section";
