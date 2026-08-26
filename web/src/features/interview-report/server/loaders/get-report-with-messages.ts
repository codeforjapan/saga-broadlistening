import "server-only";

import {
  getAuthenticatedUser,
  isSessionOwner,
} from "@/features/interview-session/server/utils/verify-session-ownership";
import type { InterviewMessage } from "@/features/interview-session/shared/types";
import type { InterviewReport } from "../../shared/types";
import {
  canViewReportWithMessages,
  getBillIdFromPublicReportSession,
  selectPrimaryBillContent,
} from "../../shared/utils/public-report-display";
import {
  countPublicOpinionsByInterviewConfigId,
  findBillWithContentById,
  findMessagesBySessionId,
  findReportWithSessionById,
} from "../repositories/interview-report-repository";

export type ReportWithMessages = {
  report: InterviewReport & {
    bill_id: string;
    session_started_at: string;
    session_completed_at: string | null;
  };
  messages: InterviewMessage[];
  bill: {
    id: string;
    name: string;
    thumbnail_url: string | null;
    bill_content: {
      title: string;
    } | null;
  };
};

/**
 * Fetch report with all messages for the chat log page.
 * Authorization: Accessible if the opinion is published OR the user is the session owner.
 */
export async function getReportWithMessages(
  reportId: string
): Promise<ReportWithMessages | null> {
  const authResult = await getAuthenticatedUser();
  const userId = authResult.authenticated ? authResult.userId : null;

  let report: Awaited<ReturnType<typeof findReportWithSessionById>>;
  try {
    report = await findReportWithSessionById(reportId);
  } catch (error) {
    console.error("Failed to fetch opinion:", error);
    return null;
  }

  const session = report.interview_sessions;
  const billId = getBillIdFromPublicReportSession(session);

  if (!session || !billId) {
    console.error("Session or policy not found for opinion");
    return null;
  }

  // Authorization check: published OR owner
  const isOwner = userId ? isSessionOwner(session.user_id, userId) : false;

  if (!isOwner) {
    let publicOpinionCount: number;
    try {
      publicOpinionCount = await countPublicOpinionsByInterviewConfigId(
        session.interview_config_id
      );
    } catch (error) {
      console.error("Failed to count public opinions:", error);
      return null;
    }

    const isPublic = canViewReportWithMessages({
      isOwner,
      reviewStatus: report.review_status,
      publicOpinionCount,
    });

    if (!isPublic) {
      return null;
    }
  }

  // Fetch messages
  let messages: InterviewMessage[];
  try {
    messages = await findMessagesBySessionId(report.interview_session_id);
  } catch (error) {
    console.error("Failed to fetch interview messages:", error);
    return null;
  }

  // Fetch policy info
  let bill: Awaited<ReturnType<typeof findBillWithContentById>>;
  try {
    bill = await findBillWithContentById(billId);
  } catch (error) {
    console.error("Failed to fetch policy:", error);
    return null;
  }

  const { interview_sessions: _, ...reportData } = report;

  return {
    report: {
      ...reportData,
      bill_id: billId,
      session_started_at: session.started_at,
      session_completed_at: session.completed_at,
    },
    messages: messages || [],
    bill: {
      id: bill.id,
      name: bill.name,
      thumbnail_url: bill.thumbnail_url,
      bill_content: selectPrimaryBillContent(bill.policy_contents),
    },
  };
}
