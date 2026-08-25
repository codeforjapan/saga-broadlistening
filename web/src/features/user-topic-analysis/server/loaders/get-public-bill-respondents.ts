import "server-only";

import {
  getPublicRespondents,
  type PublicRespondent,
} from "@mirai-gikai/topic-analysis-core/public-server";
import { getLinkedInterviewConfigId } from "@/features/interview-config/server/loaders/get-linked-interview-config-id";

export type { PublicRespondent };

/**
 * 施策に紐づく意見募集の公開回答者一覧を取得する。
 *
 * Epic #54 で回答者一覧は意見募集（interview_config）単位になったため、
 * 施策IDから紐づく意見募集を1件解決してから引く。
 */
export async function getPublicBillRespondents(
  billId: string
): Promise<PublicRespondent[]> {
  const interviewConfigId = await getLinkedInterviewConfigId(billId);
  if (!interviewConfigId) return [];
  return getPublicRespondents(interviewConfigId);
}
