import {
  isInterviewPromptKey,
  isPromptKey,
} from "@mirai-gikai/shared/prompts/catalog";
import { validatePromptTemplate } from "@mirai-gikai/shared/prompts/template";
import { z } from "zod";

const keySchema = z
  .string()
  .refine(isPromptKey, "対象のプロンプトを選択してください。");
const revisionSchema = z.number().int().nonnegative();
const noteSchema = z
  .string()
  .trim()
  .min(1, "変更理由を入力してください。")
  .max(1000);

export const savePromptSchema = z
  .object({
    key: keySchema,
    content: z.string(),
    changeNote: noteSchema,
    expectedRevision: revisionSchema,
  })
  .superRefine((value, context) => {
    if (!isPromptKey(value.key)) return;
    for (const message of validatePromptTemplate(value.key, value.content)) {
      context.addIssue({ code: "custom", path: ["content"], message });
    }
  });

export const publishPromptSchema = z.object({
  key: keySchema,
  versionId: z.uuid(),
  changeNote: noteSchema,
  expectedRevision: revisionSchema,
});

export const previewPromptSchema = z
  .object({
    key: keySchema,
    content: z.string(),
    billId: z.uuid().optional(),
    interviewConfigId: z.uuid().optional(),
    remainingMinutes: z.number().min(0).max(240).optional(),
    askedQuestionCount: z.number().int().min(0).max(1000).default(0),
    conversation: z.string().max(20000).default(""),
  })
  .superRefine((value, context) => {
    if (!isPromptKey(value.key)) return;
    for (const message of validatePromptTemplate(value.key, value.content)) {
      context.addIssue({ code: "custom", path: ["content"], message });
    }
    if (isInterviewPromptKey(value.key) && !value.interviewConfigId) {
      context.addIssue({
        code: "custom",
        path: ["interviewConfigId"],
        message: "意見募集を選択してください。",
      });
    }
    if (
      !isInterviewPromptKey(value.key) &&
      value.key !== "top-chat-system" &&
      !value.billId
    ) {
      context.addIssue({
        code: "custom",
        path: ["billId"],
        message: "施策を選択してください。",
      });
    }
  });

export function inputError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "入力内容を確認してください。";
}
