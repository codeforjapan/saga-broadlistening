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

// Epic #54 で interview_report → opinions に再定義された。
// 型名（InterviewReport）の改名は Epic #8 完了後のフォローアップ。
export type InterviewReport = Database["public"]["Tables"]["opinions"]["Row"];
export type InterviewReportInsert =
  Database["public"]["Tables"]["opinions"]["Insert"];

export type InterviewQuestion =
  Database["public"]["Tables"]["interview_questions"]["Row"];

// Request types
export interface InterviewChatRequestParams {
  messages: Array<{ role: string; content: string }>;
  /**
   * 対話する意見募集のID。施策はサーバー側で紐付けから引くため、
   * クライアントは施策を指定できない。
   */
  interviewConfigId: string;
  /**
   * 「終える」ボタンが押された。発言は保存せず、chat なら要約へ、要約中なら締めへ進む。
   * ステージそのものはサーバーがセッションから決めるため、クライアントは送らない。
   */
  action?: "end";
  isRetry?: boolean;
  /**
   * プレビュートークンの発行元施策ID。プレビュー画面からのリクエストのみが送る。
   */
  previewPolicyId?: string;
  /**
   * プレビュー用トークン。プレビュー画面からのリクエストのみが送る。
   * サーバー側で検証が通った場合に限り、非公開の施策・設定を対象にできる。
   */
  previewToken?: string;
}
