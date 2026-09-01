import "server-only";

import { convertToModelMessages, Output, streamText } from "ai";
import { getBillById } from "@/features/bills-edit/server/loaders/get-bill-by-id";
import { getBillContents } from "@/features/bills-edit/server/loaders/get-bill-contents";
import { AI_MODELS } from "@/lib/ai/models";
import { injectJsonFields } from "@/lib/stream/inject-json-fields";
import {
  type ConfigGenerationStage,
  defaultQuestionsGenerationSchema,
  questionProposalSchema,
  themeProposalSchema,
} from "../../shared/schemas";
import {
  buildConfigGenerationPrompt,
  getSubjectLabel,
  type PromptSubject,
} from "../utils/build-config-generation-prompt";

interface ExistingQuestion {
  question: string;
  follow_up_guide?: string | null;
  quick_replies?: string[] | null;
}

interface HandleConfigGenerationParams {
  messages: Array<{ role: string; content: string }>;
  /** 施策配下から呼ばれたときの施策ID。抽象テーマ型では null */
  billId: string | null;
  /** 施策がないときに題材にするテーマ名 */
  themeName?: string | null;
  /** 施策がないときに題材にするテーマの説明 */
  themeDescription?: string | null;
  stage: ConfigGenerationStage;
  existingThemes?: string[];
  existingQuestions?: ExistingQuestion[];
  confirmedQuestions?: ExistingQuestion[];
}

export async function handleConfigGeneration({
  messages,
  billId,
  themeName,
  themeDescription,
  stage,
  existingThemes,
  existingQuestions,
  confirmedQuestions,
}: HandleConfigGenerationParams) {
  const subject = await loadPromptSubject(billId, themeName, themeDescription);

  const systemPrompt = buildConfigGenerationPrompt({
    subject,
    stage,
    existingThemes,
    existingQuestions,
    confirmedQuestions,
  });

  const subjectLabel = getSubjectLabel(subject);
  const initialUserMessage =
    stage === "default_questions"
      ? `${subjectLabel}の内容を分析して、topics（Q1の論点選択肢）とstance（Q2の立場選択肢）を生成してください。`
      : stage === "theme_proposal"
        ? `確定した質問と${subjectLabel}の内容をもとに、テーマを提案してください。`
        : "質問を提案・ブラッシュアップしてください。";

  const effectiveMessages =
    messages.length === 0
      ? [{ role: "user" as const, content: initialUserMessage }]
      : messages;

  const uiMessages = effectiveMessages.map((message) => ({
    role: message.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: message.content }],
  }));

  const modelMessages = await convertToModelMessages(uiMessages);

  const onError = (error: unknown) => {
    console.error("LLM generation error:", error);
  };

  const result =
    stage === "default_questions"
      ? streamText({
          model: AI_MODELS.gpt5_2,
          system: systemPrompt,
          messages: modelMessages,
          output: Output.object({ schema: defaultQuestionsGenerationSchema }),
          onError,
        })
      : stage === "theme_proposal"
        ? streamText({
            model: AI_MODELS.gpt5_2,
            system: systemPrompt,
            messages: modelMessages,
            output: Output.object({ schema: themeProposalSchema }),
            onError,
          })
        : streamText({
            model: AI_MODELS.gpt5_2,
            system: systemPrompt,
            messages: modelMessages,
            output: Output.object({ schema: questionProposalSchema }),
            onError,
          });

  // ストリームにstageを注入
  const transformedStream = injectJsonFields(result.textStream, {
    stage,
  });

  return new Response(transformedStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * 生成の題材を読み込む。
 *
 * 施策IDがあれば施策とその「ふつう」難易度のコンテンツを、なければテーマ名を使う。
 */
async function loadPromptSubject(
  billId: string | null,
  themeName: string | null | undefined,
  themeDescription: string | null | undefined
): Promise<PromptSubject> {
  if (!billId) {
    const trimmed = themeName?.trim();
    if (!trimmed) {
      throw new Error("Neither bill nor theme name is available");
    }
    return {
      kind: "theme",
      themeName: trimmed,
      themeDescription: themeDescription ?? undefined,
    };
  }

  const [bill, billContents] = await Promise.all([
    getBillById(billId),
    getBillContents(billId),
  ]);

  if (!bill) {
    throw new Error("Bill not found");
  }

  // ふつう（normal）の難易度コンテンツを使用
  const normalContent = billContents.find(
    (c) => c.difficulty_level === "normal"
  );

  return {
    kind: "bill",
    billName: bill.name,
    billTitle: normalContent?.title || "",
    billSummary: normalContent?.summary || "",
    billContent: normalContent?.content || "",
    knowledgeSource: bill.knowledge_source ?? undefined,
  };
}
