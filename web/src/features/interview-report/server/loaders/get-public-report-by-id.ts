import "server-only";

import { shouldDisplayPublicReports } from "@mirai-gikai/shared/report-publication/auto-publish";
import { cache } from "react";
import type { InterviewMessage } from "@/features/interview-session/shared/types";
import type { InterviewReport } from "../../shared/types";
import {
  countUserMessageCharacters,
  getBillIdFromPublicReportSession,
  selectPrimaryBillContent,
} from "../../shared/utils/public-report-display";
import {
  countPublicOpinionsByInterviewConfigId,
  findBillWithContentById,
  findMessagesBySessionId,
  findOpinionSegmentsByOpinionId,
  findPublicReportWithSessionById,
} from "../repositories/interview-report-repository";

export type PublicReportOpinion = {
  title: string;
  content: string;
  source_message_id: string | null;
};

export type PublicReportData = InterviewReport & {
  bill_id: string;
  session_started_at: string;
  session_completed_at: string | null;
  bill: {
    id: string;
    name: string;
    thumbnail_url: string | null;
    share_thumbnail_url: string | null;
    bill_content: { title: string } | null;
  };
  opinions: PublicReportOpinion[];
  characterCount: number;
  messages: InterviewMessage[];
};

/**
 * 公開意見をIDから取得（認証不要）
 * 公開条件: review_status = 'published'
 * React cache()でリクエスト内のDB呼び出しを重複排除
 */
export const getPublicReportById = cache(
  async (reportId: string): Promise<PublicReportData | null> => {
    // 公開条件を満たさない場合（非公開・終了した意見募集配下など）は null が返る。
    // インフラ障害等の場合は repository が throw し、ここでは捕捉せず伝播させる。
    const report = await findPublicReportWithSessionById(reportId);
    if (!report) {
      return null;
    }

    const session = report.interview_sessions;
    if (!session) {
      return null;
    }

    const billId = getBillIdFromPublicReportSession(session);
    if (!billId) {
      return null;
    }

    let publicOpinionCount: number;
    try {
      publicOpinionCount = await countPublicOpinionsByInterviewConfigId(
        session.interview_config_id
      );
    } catch (error) {
      console.error("Failed to count public opinions:", error);
      return null;
    }
    if (!shouldDisplayPublicReports(publicOpinionCount)) {
      return null;
    }

    const [bill, messages, segments] = await Promise.all([
      findBillWithContentById(billId),
      findMessagesBySessionId(report.interview_session_id),
      findOpinionSegmentsByOpinionId(report.id),
    ]);

    const { interview_sessions: _, ...reportData } = report;

    return {
      ...reportData,
      bill_id: billId,
      session_started_at: session.started_at,
      session_completed_at: session.completed_at,
      bill: {
        id: bill.id,
        name: bill.name,
        thumbnail_url: bill.thumbnail_url,
        share_thumbnail_url: bill.share_thumbnail_url,
        bill_content: selectPrimaryBillContent(bill.policy_contents),
      },
      opinions: segments,
      characterCount: countUserMessageCharacters(messages),
      messages,
    };
  }
);
