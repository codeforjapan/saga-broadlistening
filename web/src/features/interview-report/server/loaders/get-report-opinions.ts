import "server-only";

import type { PublicReportOpinion } from "./get-public-report-by-id";
import { findOpinionSegmentsByOpinionId } from "../repositories/interview-report-repository";

/**
 * 意見IDから論点単位の意見（opinion_segments）を取得する。
 *
 * Epic #54 で opinions テーブルの JSONB カラムが廃止され、論点単位の意見は
 * opinion_segments に切り出された。
 */
export async function getReportOpinions(
  reportId: string
): Promise<PublicReportOpinion[]> {
  try {
    return await findOpinionSegmentsByOpinionId(reportId);
  } catch (error) {
    console.error("Failed to fetch opinion segments:", error);
    return [];
  }
}
