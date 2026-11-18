import "server-only";

import type { PublicTopicAnalysis } from "@mirai-gikai/topic-analysis-core/public-server";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { countPublicOpinionsByInterviewConfigId } from "@/features/interview-report/server/repositories/interview-report-repository";
import { getPublicTopicAnalysisByInterviewConfigId } from "./get-public-topic-analysis";
import {
  getTopicAnalysisSubject,
  type TopicAnalysisSubjectContext,
} from "./get-topic-analysis-subject";

/**
 * トピック分析を表示するページを描くのに必要な一式。
 *
 * 対象の解決（getTopicAnalysisSubject）に、公開中の分析と公開意見件数を足したもの。
 * 分析を出さない画面（回答一覧など）は重い分析取得を避けるため、対象の解決だけを使う。
 */
export type TopicAnalysisContext = TopicAnalysisSubjectContext & {
  /** 公開中のトピック分析。公開版が無ければ null（呼び出し側で「準備中」扱い） */
  analysis: PublicTopicAnalysis | null;
  /** 公開意見の件数。回答件数ピルと引用リンクの k-匿名性ゲート判定に使う */
  publicOpinionCount: number;
};

/**
 * 起点（施策 / テーマ）からトピック分析ページの一式を解決する。
 *
 * 対象が存在しない・公開されていない場合は null（呼び出し側で notFound() にする）。
 * 分析と公開意見件数は互いに独立なので並列で引き、意見募集が未解決なら
 * どちらも引かない（分析も出ないため）。
 */
export async function getTopicAnalysisContext(
  target: InterviewTarget
): Promise<TopicAnalysisContext | null> {
  const subject = await getTopicAnalysisSubject(target);
  if (!subject) return null;

  if (!subject.interviewConfigId) {
    return { ...subject, analysis: null, publicOpinionCount: 0 };
  }

  const [analysis, publicOpinionCount] = await Promise.all([
    getPublicTopicAnalysisByInterviewConfigId(subject.interviewConfigId),
    countPublicOpinionsByInterviewConfigId(subject.interviewConfigId),
  ]);

  return { ...subject, analysis, publicOpinionCount };
}
