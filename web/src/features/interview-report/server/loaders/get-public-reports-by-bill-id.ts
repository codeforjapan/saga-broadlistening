import "server-only";

import { shouldDisplayPublicReports } from "@mirai-gikai/shared/report-publication/auto-publish";
import { getLinkedInterviewConfigId } from "@/features/interview-config/server/loaders/get-linked-interview-config-id";
import type { PublicInterviewReport } from "../../shared/utils/public-report-display";
import {
  countPublicOpinionsByInterviewConfigId,
  findPublicOpinionsByConfigId,
} from "../repositories/interview-report-repository";

// 既存の呼び出し元がこのローダー経由で型を参照しているため再エクスポートする。
export type { PublicInterviewReport };

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

  if (!shouldDisplayPublicReports(totalCount)) {
    return { reports: [], totalCount: 0 };
  }

  const reports = await findPublicOpinionsByConfigId(interviewConfigId, 3);

  return { reports, totalCount };
}
