import "server-only";

import { shouldDisplayPublicReports } from "@mirai-gikai/shared/report-publication/auto-publish";
import {
  getReportOrigin,
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
    if (!session) {
      return null;
    }

    // k-匿名性ゲートを満たさない意見は OGP でも中身を出さない。
    // 施策が紐づかないテーマ（抽象テーマ型）でも必ず通すこと。ここを
    // 施策の有無で分岐させると、施策0件のテーマだけゲートを素通りする。
    const publicOpinionCount = await countPublicOpinionsByInterviewConfigId(
      session.interview_config_id
    );
    if (!shouldDisplayPublicReports(publicOpinionCount)) {
      return null;
    }

    // 施策名はテーマに施策が紐づいているときだけ出す。
    // 抽象テーマ型はテーマ名で代替する
    const origin = getReportOrigin(session);
    let billName = origin?.theme.name ?? "";
    if (origin?.policyId) {
      const bill = await findBillWithContentById(origin.policyId);
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
