import "server-only";

import {
  getBillIdFromPublicReportSession,
  selectPrimaryBillContent,
  shouldDisplayPublicOpinions,
} from "../../shared/utils/public-report-display";
import {
  countPublicOpinionsByInterviewConfigId,
  findBillWithContentById,
  findPublicReportWithSessionById,
} from "../repositories/interview-report-repository";

export interface ReportOgData {
  summary: string;
  billName: string;
}

/**
 * OGP画像生成に必要な意見データを取得
 */
export async function getReportOgData(
  reportId: string
): Promise<ReportOgData | null> {
  let report: Awaited<ReturnType<typeof findPublicReportWithSessionById>>;
  try {
    report = await findPublicReportWithSessionById(reportId);
  } catch {
    return null;
  }
  if (!report) {
    return null;
  }

  const session = report.interview_sessions;

  let billName = "";
  const billId = getBillIdFromPublicReportSession(session);
  if (billId && session) {
    let publicOpinionCount: number;
    try {
      publicOpinionCount = await countPublicOpinionsByInterviewConfigId(
        session.interview_config_id
      );
    } catch (error) {
      console.error("Failed to count public opinions for OGP:", error);
      return null;
    }
    if (!shouldDisplayPublicOpinions(publicOpinionCount)) {
      return null;
    }

    let bill: Awaited<ReturnType<typeof findBillWithContentById>>;
    try {
      bill = await findBillWithContentById(billId);
    } catch (error) {
      console.error("Failed to fetch policy for OGP:", error);
      return null;
    }
    const billContent = selectPrimaryBillContent(bill.policy_contents);
    billName = billContent?.title || bill.name;
  }

  return {
    summary: report.summary || "",
    billName,
  };
}
