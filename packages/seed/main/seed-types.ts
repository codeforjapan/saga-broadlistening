import type { Database } from "@mirai-gikai/supabase";

type OpinionInsert = Database["public"]["Tables"]["opinions"]["Insert"];
type OpinionSegmentInsert =
  Database["public"]["Tables"]["opinion_segments"]["Insert"];

/**
 * 論点単位の意見（opinion_segments）の投入前データ。
 *
 * `opinion_id` は意見の INSERT 後にしか分からず、`source_message_id` も
 * 対話メッセージの INSERT 後にしか分からないため、seed 側では
 * 「どのメッセージ本文が元か」だけを持っておき run.ts で解決する。
 */
export interface OpinionSegmentSeed
  extends Omit<
    OpinionSegmentInsert,
    "id" | "opinion_id" | "source_message_id" | "created_at" | "updated_at"
  > {
  /** source_message_id を解決するための元メッセージ本文（セッション内で一意） */
  sourceMessageContent?: string;
}

/** 意見 1 件とその論点のセット */
export interface OpinionSeed {
  opinion: Omit<OpinionInsert, "created_at" | "updated_at">;
  segments: OpinionSegmentSeed[];
}

type InterviewSessionInsert =
  Database["public"]["Tables"]["interview_sessions"]["Insert"];

/**
 * seed 側で ID を採番した対話セッション。
 * INSERT の戻り順に依存せずメッセージ・意見を紐付けられるようにする。
 */
export type SeededInterviewSession = InterviewSessionInsert & { id: string };
