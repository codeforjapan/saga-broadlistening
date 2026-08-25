import "server-only";

import { shouldDisplayPublicReports } from "@mirai-gikai/shared/report-publication/auto-publish";
import {
  getBillIdFromPublicReportSession,
  selectPrimaryBillContent,
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
  try {
    const report = await findPublicReportWithSessionById(reportId);
    if (!report) {
      return null;
    }

    const session = report.interview_sessions;
    const billId = getBillIdFromPublicReportSession(session);

    let billName = "";
    if (billId && session) {
      const publicOpinionCount = await countPublicOpinionsByInterviewConfigId(
        session.interview_config_id
      );
      // k-匿名性ゲートを満たさない意見は OGP でも中身を出さない。
      if (!shouldDisplayPublicReports(publicOpinionCount)) {
        return null;
      }

      const bill = await findBillWithContentById(billId);
      const billContent = selectPrimaryBillContent(bill.policy_contents);
      billName = billContent?.title || bill.name;
    }

    return {
      summary: report.summary || "",
      billName,
    };
  } catch (error) {
    // OGP は付随的な表示なので、どの段階で落ちても画像を出さずに握りつぶす。
    console.error("Failed to build OGP data:", error);
    return null;
  }
}
