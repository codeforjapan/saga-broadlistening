import type { InterviewConfigInput } from "../types";

/** 意見募集のレコードに書き込む値を、フォーム入力から組み立てる */
export function toConfigRecord(validatedData: InterviewConfigInput) {
  const publicationMode = validatedData.publication_mode ?? "when_ready";
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
    purpose_type: validatedData.purpose_type ?? null,
    opinion_focus: validatedData.opinion_focus?.trim() || null,
    decided_matters: validatedData.decided_matters?.trim() || null,
    publication_mode: publicationMode,
    // まとまり次第お知らせするときは、時期と場所を持たない
    publication_timing:
      publicationMode === "scheduled"
        ? validatedData.publication_timing?.trim() || null
        : null,
    publication_place:
      publicationMode === "scheduled"
        ? (validatedData.publication_place ?? null)
        : null,
  };
}
