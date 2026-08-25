import "server-only";

import {
  locateTopic,
  type TopicLocation,
} from "../../shared/utils/locate-topic";
import { getPublicTopicAnalysis } from "./get-public-topic-analysis";

/**
 * 施策の公開トピック分析から、指定トピックの詳細（表示順・前後トピック含む）を取得する。
 *
 * 公開版が無い、またはトピックが無ければ null。
 * Epic #54 で回答者カテゴリ・賛否のフィルタ軸が廃止されたため、
 * 前後トピックは常に全件の並びで算出する。
 */
export async function getPublicTopicDetail(
  billId: string,
  topicId: string
): Promise<TopicLocation | null> {
  const analysis = await getPublicTopicAnalysis(billId);
  if (!analysis) return null;
  return locateTopic(analysis.topics, topicId);
}
