import type { Database } from "@mirai-gikai/supabase";

// Epic #54 で interview_report → opinions に再定義された。
// 型名（InterviewReport）の改名は Epic #8 完了後のフォローアップ。
export type InterviewReport = Database["public"]["Tables"]["opinions"]["Row"];
export type InterviewReportInsert =
  Database["public"]["Tables"]["opinions"]["Insert"];
