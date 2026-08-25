import type { Database } from "@mirai-gikai/supabase";

// Database types
export type InterviewSession =
  Database["public"]["Tables"]["interview_sessions"]["Row"];
export type InterviewSessionInsert =
  Database["public"]["Tables"]["interview_sessions"]["Insert"];
export type InterviewSessionUpdate =
  Database["public"]["Tables"]["interview_sessions"]["Update"];

export type InterviewMessage =
  Database["public"]["Tables"]["interview_messages"]["Row"];
export type InterviewMessageInsert =
  Database["public"]["Tables"]["interview_messages"]["Insert"];

// Epic #54 で interview_report → opinions、interview_opinion → opinion_segments に
// 再定義された。型名（InterviewReport / InterviewOpinion）の改名は
// Epic #8 完了後のフォローアップ。
export type InterviewReport = Database["public"]["Tables"]["opinions"]["Row"];
export type InterviewReportInsert =
  Database["public"]["Tables"]["opinions"]["Insert"];

export type InterviewOpinion =
  Database["public"]["Tables"]["opinion_segments"]["Row"];
export type InterviewOpinionInsert =
  Database["public"]["Tables"]["opinion_segments"]["Insert"];

export type InterviewQuestion =
  Database["public"]["Tables"]["interview_questions"]["Row"];

// Request types
export interface InterviewChatRequestParams {
  messages: Array<{ role: string; content: string }>;
  billId: string;
  currentStage: "chat" | "summary" | "summary_complete";
  isRetry?: boolean;
  nextQuestionId?: string;
  /**
   * プレビュー用トークン。プレビュー画面からのリクエストのみが送る。
   * サーバー側で検証が通った場合に限り、非公開の議案・設定を対象にできる。
   */
  previewToken?: string;
}
