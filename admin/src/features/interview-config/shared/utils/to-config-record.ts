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
    participation_mode: validatedData.participation_mode,
    // public では連携元の指定は意味を持たないので空にして保存する
    allowed_provider_keys:
      validatedData.participation_mode === "external_identity"
        ? validatedData.allowed_provider_keys
        : [],
  };
}
