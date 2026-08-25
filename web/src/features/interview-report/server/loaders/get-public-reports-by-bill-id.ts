import "server-only";

import { getLinkedInterviewConfigId } from "@/features/interview-config/server/loaders/get-linked-interview-config-id";
import {
  mapPublicInterviewReports,
  type PublicInterviewReportDisplay,
  shouldDisplayPublicOpinions,
} from "../../shared/utils/public-report-display";
import {
  countPublicOpinionsByInterviewConfigId,
  findPublicOpinionsByConfigId,
} from "../repositories/interview-report-repository";

export type PublicInterviewReport = PublicInterviewReportDisplay;

export type PublicReportsResult = {
  reports: PublicInterviewReport[];
  totalCount: number;
};

/**
 * 施策IDから公開意見（最大3件）と総件数を取得
 *
 * 公開意見は意見募集（テーマ）単位で集計するため、施策に紐づく意見募集を
 * 1件解決してから引く。
 */
export async function getPublicReportsByBillId(
  billId: string
): Promise<PublicReportsResult> {
  const interviewConfigId = await getLinkedInterviewConfigId(billId);
  if (!interviewConfigId) {
    return { reports: [], totalCount: 0 };
  }

  const totalCount =
    await countPublicOpinionsByInterviewConfigId(interviewConfigId);

  if (!shouldDisplayPublicOpinions(totalCount)) {
    return { reports: [], totalCount: 0 };
  }

  const rawReports = await findPublicOpinionsByConfigId(interviewConfigId, 3);
  const reports = mapPublicInterviewReports(rawReports);

  return { reports, totalCount };
}
