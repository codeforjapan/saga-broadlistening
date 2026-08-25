import "server-only";

import { shouldDisplayPublicReports } from "@mirai-gikai/shared/report-publication/auto-publish";
import { getLinkedInterviewConfigId } from "@/features/interview-config/server/loaders/get-linked-interview-config-id";
import { buildPublicReportsPage } from "../../shared/utils/public-report-display";
import type { SortOrder } from "../../shared/utils/sort-order";
import {
  countPublicOpinionsByInterviewConfigId,
  findPublicOpinionsByConfigId,
} from "../repositories/interview-report-repository";
import type { PublicInterviewReport } from "./get-public-reports-by-bill-id";

export const PAGE_SIZE = 20;

export type PaginatedPublicReportsResult = {
  reports: PublicInterviewReport[];
  totalCount: number;
  hasMore: boolean;
};

/**
 * 公開意見の指定ページと総件数を取得
 *
 * Epic #54 で賛否（stance）は廃止したため、絞り込みはソート順のみ。
 */
async function getPublicReportsPage(
  billId: string,
  offset: number,
  sortOrder: SortOrder
): Promise<PaginatedPublicReportsResult> {
  const interviewConfigId = await getLinkedInterviewConfigId(billId);
  if (!interviewConfigId) {
    return { reports: [], totalCount: 0, hasMore: false };
  }

  const totalCount =
    await countPublicOpinionsByInterviewConfigId(interviewConfigId);

  if (!shouldDisplayPublicReports(totalCount)) {
    return { reports: [], totalCount: 0, hasMore: false };
  }

  const rawReports = await findPublicOpinionsByConfigId(
    interviewConfigId,
    PAGE_SIZE + 1,
    offset,
    sortOrder
  );
  const { reports, hasMore } = buildPublicReportsPage(rawReports, PAGE_SIZE);

  return { reports, totalCount, hasMore };
}

/**
 * 施策IDから公開意見の初回ページと総件数を取得
 */
export async function getInitialPublicReportsByBillId(
  billId: string,
  sortOrder: SortOrder = "recommended"
): Promise<PaginatedPublicReportsResult> {
  return getPublicReportsPage(billId, 0, sortOrder);
}

/**
 * ページネーション用: 次のページの公開意見を取得
 */
export async function getPublicReportsByBillIdPaginated(
  billId: string,
  offset: number,
  sortOrder: SortOrder = "recommended"
): Promise<{ reports: PublicInterviewReport[]; hasMore: boolean }> {
  const { reports, hasMore } = await getPublicReportsPage(
    billId,
    offset,
    sortOrder
  );
  return { reports, hasMore };
}
