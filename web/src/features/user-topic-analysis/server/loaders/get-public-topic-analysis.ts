import "server-only";

import {
  getPublicTopicAnalysis as fetchPublicTopicAnalysis,
  type PublicTopicAnalysis,
} from "@mirai-gikai/topic-analysis-core/public-server";
import { cache } from "react";
import { getLinkedInterviewConfigId } from "@/features/interview-config/server/loaders/get-linked-interview-config-id";

/**
 * 意見募集（テーマ）の公開中トピック分析を、§8 の表示時フィルタ適用後の表示用データで取得する。
 * 公開版が無ければ null（呼び出し側で「分析準備中」扱いにする）。
 *
 * 施策に紐づくテーマも施策を持たない抽象テーマ型も、分析は意見募集単位なのでここを通る。
 * 取得・フィルタの本体は @mirai-gikai/topic-analysis-core/public に集約（web/admin 共有）。
 * React cache() でリクエスト内のDB呼び出しを重複排除する
 * （generateMetadata とページ本体で同じテーマを取得しても1回のクエリで済む）。
 */
export const getPublicTopicAnalysisByInterviewConfigId = cache(
  async (interviewConfigId: string): Promise<PublicTopicAnalysis | null> =>
    fetchPublicTopicAnalysis(interviewConfigId)
);

/**
 * 施策の公開中トピック分析を取得する。
 *
 * Epic #54 でトピック分析は意見募集（interview_config）単位になったため、
 * 施策IDから紐づく意見募集を1件解決してから引く。
 */
export const getPublicTopicAnalysis = cache(
  async (billId: string): Promise<PublicTopicAnalysis | null> => {
    const interviewConfigId = await getLinkedInterviewConfigId(billId);
    if (!interviewConfigId) return null;
    return getPublicTopicAnalysisByInterviewConfigId(interviewConfigId);
  }
);
