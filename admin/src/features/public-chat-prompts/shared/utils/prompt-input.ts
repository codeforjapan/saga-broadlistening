import { isPublicPromptKey } from "@mirai-gikai/shared/prompts/catalog";
import { validatePromptTemplate } from "@mirai-gikai/shared/prompts/template";
import { z } from "zod";

const keySchema = z
  .string()
  .refine(isPublicPromptKey, "対象のプロンプトを選択してください。");
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
    if (!isPublicPromptKey(value.key)) return;
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
  })
  .superRefine((value, context) => {
    if (!isPublicPromptKey(value.key)) return;
    for (const message of validatePromptTemplate(value.key, value.content)) {
      context.addIssue({ code: "custom", path: ["content"], message });
    }
    if (value.key !== "top-chat-system" && !value.billId) {
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
