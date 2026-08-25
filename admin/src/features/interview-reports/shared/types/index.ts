import type { Database } from "@mirai-gikai/supabase";
import type { SortConfig } from "@/lib/sort";

export type InterviewSession =
  Database["public"]["Tables"]["interview_sessions"]["Row"];

// Epic #54 で interview_report は opinions に再定義された。
// 名前の改名は Epic #8 完了後のフォローアップで行う。
export type InterviewReport = Database["public"]["Tables"]["opinions"]["Row"];

export type InterviewMessage =
  Database["public"]["Tables"]["interview_messages"]["Row"];

export type InterviewSessionWithDetails = InterviewSession & {
  message_count: number;
  helpful_count: number;
  interview_report: InterviewReport | null;
};

export type ReactionCounts = {
  helpful: number;
};

export interface MatchedUserMessage {
  id: string;
  interview_session_id: string;
  content: string;
  created_at: string;
}

export interface SessionMatchGroup {
  sessionId: string;
  messages: MatchedUserMessage[];
}

export type MessageSearchSession = InterviewSession & {
  interview_report: InterviewReport | null;
  matched_messages: MatchedUserMessage[];
};

export type OpinionSegment = {
  title: string;
  content: string;
  source_message_id: string | null;
};

export type InterviewSessionDetail = InterviewSession & {
  interview_report: InterviewReport | null;
  /** 論点単位の意見（旧 interview_report.opinions の JSONB） */
  opinion_segments: OpinionSegment[];
  interview_messages: InterviewMessage[];
  reaction_counts: ReactionCounts | null;
  feedback_tags: string[];
};

// フィルタ関連の型定義
export type SessionStatusFilter =
  | "all"
  | "completed"
  | "in_progress"
  | "archived";
export type VisibilityFilter = "all" | "public" | "private";
export type ModerationFilter = "all" | "ok" | "warning" | "ng" | "unscored";

export interface SessionFilterConfig {
  status: SessionStatusFilter;
  visibility: VisibilityFilter;
  moderation: ModerationFilter;
}

export const SESSION_STATUS_FILTER_VALUES: readonly SessionStatusFilter[] = [
  "all",
  "completed",
  "in_progress",
  "archived",
] as const;

export const VISIBILITY_FILTER_VALUES: readonly VisibilityFilter[] = [
  "all",
  "public",
  "private",
] as const;

export const MODERATION_FILTER_VALUES: readonly ModerationFilter[] = [
  "all",
  "ok",
  "warning",
  "ng",
  "unscored",
] as const;

export const DEFAULT_SESSION_FILTER: SessionFilterConfig = {
  status: "completed",
  visibility: "all",
  moderation: "all",
};

// 発言検索のフィルタ。roleTitle は部分一致（空文字 = フィルタなし）
export interface MessageSearchFilterConfig {
  roleTitle: string;
}

export const DEFAULT_MESSAGE_SEARCH_FILTER: MessageSearchFilterConfig = {
  roleTitle: "",
};

export type InterviewStatistics = {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  avgRating: number | null;
  avgTotalContentRichness: number | null;
  avgMessageCount: number | null;
  medianDurationSeconds: number | null;
  totalDurationSeconds: number;
  publicByUserCount: number;
  publishedCount: number;
  publicRate: number;
  feedbackIrrelevantQuestions: number;
  feedbackNotAligned: number;
  feedbackMisunderstood: number;
  feedbackTooManyQuestions: number;
  feedbackOther: number;
};

export type QuestionAnswerCount = {
  questionId: string;
  question: string;
  questionOrder: number;
  askedSessionCount: number;
  answeredSessionCount: number;
};

// ソート関連の型定義
export type SessionSortField =
  | "started_at"
  | "message_count"
  | "total_content_richness"
  | "helpful_count"
  | "moderation_score";

export const SESSION_SORT_FIELDS: readonly SessionSortField[] = [
  "started_at",
  "message_count",
  "total_content_richness",
  "helpful_count",
  "moderation_score",
] as const;

export type SessionSortConfig = SortConfig<SessionSortField>;

export const DEFAULT_SESSION_SORT: SessionSortConfig = {
  field: "started_at",
  order: "desc",
};

export { formatDuration } from "../utils/format-duration";
export {
  getSessionStatus,
  type SessionStatus,
} from "../utils/get-session-status";
