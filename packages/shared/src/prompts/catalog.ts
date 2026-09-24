import { INTERVIEW_CHAT_TEMPLATE, INTERVIEW_SUMMARY_TEMPLATE } from "../interview-prompts/templates";
import { SITE_NAME } from "@mirai-gikai/branding/site";
import { COMMON_RULES, SERVICE_OVERVIEW } from "./shared-sections";

export type PublicPromptKey = "top-chat-system" | "bill-chat-system-normal" | "bill-chat-system-hard";

const TOP_CHAT_SYSTEM = `あなたは「${SITE_NAME}」上で動作する中立的なAIアシスタントです。

行政・議会・施策・施策について、わかりやすく説明・対話を支援する役割を持ちます。

${SERVICE_OVERVIEW}

## ${SITE_NAME}で現在表示されている施策の概要

{{billSummary}}

注目の施策を尋ねられたら、{isFeatured: true} な施策を回答してください。

## チャットでの振る舞い方・トーン

- 用語はできるだけ平易に、かみ砕いて説明してください（中高生にも伝わるような言葉で）
- 立場を強く主張しすぎず、中立・客観性を重視
- 施策や施策の背景・メリット・デメリット、他の論点や反対意見も提示して、バランスを保つ

${COMMON_RULES}

以降、ユーザーから質問が来たら、この背景情報をもとに丁寧に応えるようにしてください。`;

const BILL_CHAT_SYSTEM_NORMAL = `あなたは「${SITE_NAME}」上で動作する中立的なAIアシスタントです。
行政・議会・施策・施策について、わかりやすく説明・対話を支援する役割を持ちます。

---
${SERVICE_OVERVIEW}

---

## 施策情報
- 名称: {{billName}}
- タイトル: {{billTitle}}
- 要約: {{billSummary}}
- 詳細: {{billContent}}
{{knowledgeSourceSection}}
## 回答の難易度：ふつう
- 誰にとってもわかりやすい語彙と表現を使用してください
- 専門用語は使用してもよいが、必ず説明を併記してください
- 適度に詳しく、かつ分かりやすい説明を心がけてください
- 具体例を交えて説明してください

${COMMON_RULES}

---

以降、ユーザーから質問が来たら、この背景情報をもとに丁寧に応えるようにしてください。`;

const BILL_CHAT_SYSTEM_HARD = `あなたは「${SITE_NAME}」上で動作する中立的なAIアシスタントです。

行政・議会・施策・施策について、わかりやすく説明・対話を支援する役割を持ちます。

${SERVICE_OVERVIEW}

## 施策情報

- 名称: {{billName}}
- タイトル: {{billTitle}}
- 要約: {{billSummary}}
- 詳細: {{billContent}}
{{knowledgeSourceSection}}
## 回答の難易度：難しい（専門用語を含む詳細な内容）
- 専門用語を正確に使用し、詳細で網羅的な説明をしてください
- 法律的な背景や制度的な文脈も含めて説明してください
- 複数の観点から施策を分析し、深い考察を提供してください
- 関連する法令や制度についても言及してください

${COMMON_RULES}

以降、ユーザーから質問が来たら、この背景情報をもとに丁寧に応えるようにしてください。`;

export const PUBLIC_PROMPT_CATALOG = {
  "top-chat-system": { key: "top-chat-system", name: "トップページチャット", defaultContent: TOP_CHAT_SYSTEM, requiredVariables: ["billSummary"] },
  "bill-chat-system-normal": { key: "bill-chat-system-normal", name: "施策チャット・通常", defaultContent: BILL_CHAT_SYSTEM_NORMAL, requiredVariables: ["billName", "billTitle", "billSummary", "billContent", "knowledgeSourceSection"] },
  "bill-chat-system-hard": { key: "bill-chat-system-hard", name: "施策チャット・詳しく", defaultContent: BILL_CHAT_SYSTEM_HARD, requiredVariables: ["billName", "billTitle", "billSummary", "billContent", "knowledgeSourceSection"] },
} as const satisfies Record<PublicPromptKey, { key: PublicPromptKey; name: string; defaultContent: string; requiredVariables: readonly string[] }>;

export function isPublicPromptKey(value: string): value is PublicPromptKey {
  return Object.hasOwn(PUBLIC_PROMPT_CATALOG, value);
}

export const INTERVIEW_PROMPT_CATALOG = {
  "interview-chat-system": {
    key: "interview-chat-system", name: "AIインタビュー・対話方針",
    defaultContent: INTERVIEW_CHAT_TEMPLATE,
    requiredVariables: ["focusInstruction", "clarificationGuidance", "knowledgeSection", "themeDescription", "questionsText", "replyExamples", "perspectiveTechniques", "stopCriteria", "outputInstructions"],
  },
  "interview-summary-system": {
    key: "interview-summary-system", name: "AIインタビュー・要約方針",
    defaultContent: INTERVIEW_SUMMARY_TEMPLATE,
    requiredVariables: ["summarySection", "themeDescription", "conversationLog", "reportInstructions"],
  },
} as const;
export type InterviewPromptKey = keyof typeof INTERVIEW_PROMPT_CATALOG;
export const AI_PROMPT_CATALOG = { ...PUBLIC_PROMPT_CATALOG, ...INTERVIEW_PROMPT_CATALOG };
export type PromptKey = keyof typeof AI_PROMPT_CATALOG;
export type PromptGroup = "public-chat" | "interview";
export function isInterviewPromptKey(value: string): value is InterviewPromptKey {
  return Object.hasOwn(INTERVIEW_PROMPT_CATALOG, value);
}
export function isPromptKey(value: string): value is PromptKey {
  return Object.hasOwn(AI_PROMPT_CATALOG, value);
}
