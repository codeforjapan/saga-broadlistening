import "server-only";

import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import {
  locateTopic,
  type TopicLocation,
} from "../../shared/utils/locate-topic";
import { getTopicAnalysisContext } from "./get-topic-analysis-context";

/**
 * 公開中のトピック分析から、指定トピックの詳細（表示順・前後トピック含む）を取得する。
 *
 * 公開版が無い、またはトピックが見つからなければ null。
 * Epic #54 で回答者カテゴリ・賛否のフィルタ軸が廃止されたため、
 * 前後トピックは常に全件の並びで算出する。
 * 分析の取得は getTopicAnalysisContext のキャッシュに乗るため、
 * generateMetadata とページ本体で呼んでもクエリは重複しない。
 */
export async function getTopicLocation(
  target: InterviewTarget,
  topicId: string
): Promise<TopicLocation | null> {
  const context = await getTopicAnalysisContext(target);
  return locateTopic(context?.analysis?.topics ?? [], topicId);
}
