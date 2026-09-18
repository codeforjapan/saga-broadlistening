import type { InterviewConfigInput } from "../types";

/** 意見募集のレコードに書き込む値を、フォーム入力から組み立てる */
export function toConfigRecord(validatedData: InterviewConfigInput) {
  return {
    name: validatedData.name,
    slug: validatedData.slug,
    status: validatedData.status,
    description: validatedData.description || null,
    chat_model: validatedData.chat_model || "",
    estimated_duration: validatedData.estimated_duration ?? null,
    thumbnail_url: validatedData.thumbnail_url || null,
  };
}
