import "server-only";

import { shouldDisplayPublicReports } from "@mirai-gikai/shared/report-publication/auto-publish";
import { cache } from "react";
import type { InterviewMessage } from "@/features/interview-session/shared/types";
import type { InterviewReport } from "../../shared/types";
import {
  countUserMessageCharacters,
  getReportOrigin,
  type ReportOrigin,
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
  /** 意見が寄せられた対象（施策・テーマ） */
  origin: ReportOrigin;
  session_started_at: string;
  session_completed_at: string | null;
  /** 紐づく公開済み施策。抽象テーマ型では null */
  bill: {
    id: string;
    name: string;
    thumbnail_url: string | null;
    share_thumbnail_url: string | null;
    bill_content: { title: string } | null;
  } | null;
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

    const origin = getReportOrigin(session);
    if (!origin) {
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

    // 抽象テーマ型では施策がないので取得しない
    const [bill, messages, segments] = await Promise.all([
      origin.policyId ? findBillWithContentById(origin.policyId) : null,
      findMessagesBySessionId(report.interview_session_id),
      findOpinionSegmentsByOpinionId(report.id),
    ]);

    const { interview_sessions: _, ...reportData } = report;

    return {
      ...reportData,
      origin,
      session_started_at: session.started_at,
      session_completed_at: session.completed_at,
      bill: bill
        ? {
            id: bill.id,
            name: bill.name,
            thumbnail_url: bill.thumbnail_url,
            share_thumbnail_url: bill.share_thumbnail_url,
            bill_content: selectPrimaryBillContent(bill.policy_contents),
          }
        : null,
      opinions: segments,
      characterCount: countUserMessageCharacters(messages),
      messages,
    };
  }
);
