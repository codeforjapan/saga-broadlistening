import "server-only";

import {
  getAuthenticatedUser,
  isSessionOwner,
} from "@/features/interview-session/server/utils/verify-session-ownership";
import type { InterviewReport } from "../../shared/types";
import {
  getReportOrigin,
  type ReportOrigin,
} from "../../shared/utils/public-report-display";
import { findReportWithSessionById } from "../repositories/interview-report-repository";

export type InterviewReportWithSessionInfo = InterviewReport & {
  /** 意見が寄せられた対象（施策・テーマ） */
  origin: ReportOrigin;
  session_started_at: string;
  session_completed_at: string | null;
};

/**
 * レポートIDからインタビューレポートと関連情報を取得
 * 認可チェック: セッションの所有者のみがレポートを取得できる
 */
export async function getInterviewReportById(
  reportId: string,
  options?: { onlyOwner?: boolean }
): Promise<InterviewReportWithSessionInfo | null> {
  const authResult = await getAuthenticatedUser();

  if (!authResult.authenticated) {
    console.error("Failed to get user:", authResult.error);
    return null;
  }

  const { userId } = authResult;

  let report: Awaited<ReturnType<typeof findReportWithSessionById>>;
  try {
    report = await findReportWithSessionById(reportId);
  } catch (error) {
    console.error("Failed to fetch opinion:", error);
    return null;
  }

  // セッション情報を取得
  const session = report.interview_sessions;

  if (!session) {
    console.error("Session not found for opinion");
    return null;
  }

  // 認可チェック: 公開設定されているか、またはセッションの所有者であるか
  const isOwner = isSessionOwner(session.user_id, userId);
  const isAllowed = options?.onlyOwner
    ? isOwner
    : report.is_public_by_user || isOwner;

  if (!isAllowed) {
    console.error("Unauthorized access to opinion");
    return null;
  }

  // 意見の起点（施策・テーマ）を取得。抽象テーマ型では施策IDが null になる
  const origin = getReportOrigin(session);
  if (!origin) {
    console.error("Interview config not found for interview session");
    return null;
  }

  // 意見データを返す
  const { interview_sessions: _, ...reportData } = report;
  return {
    ...reportData,
    origin,
    session_started_at: session.started_at,
    session_completed_at: session.completed_at,
  };
}
