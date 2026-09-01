import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { routes } from "@/lib/routes";

/**
 * トピック分析の閲覧ページへのリンクを、意見募集の起点から組み立てる。
 *
 * 施策に紐づく意見募集は施策配下（/bills/[id]/topics）、施策を持たない抽象テーマ型は
 * テーマ配下（/interviews/[slug]/topics）に同じ画面を出す。
 * 参加導線（interview-links.ts）と同じく、分岐の判断はここに一本化する。
 */
export function getTopicsLink(target: InterviewTarget): string {
  if (target.kind === "theme") {
    return routes.interviewThemeTopics(target.slug);
  }
  return routes.billTopics(target.policyId);
}

/** トピック詳細ページへのリンクを取得する。 */
export function getTopicDetailLink(
  target: InterviewTarget,
  topicId: string
): string {
  if (target.kind === "theme") {
    return routes.interviewThemeTopicDetail(target.slug, topicId);
  }
  return routes.billTopicDetail(target.policyId, topicId);
}

/**
 * 回答一覧ページへのリンクを取得する。
 *
 * 抽象テーマ型にはテーマ配下の回答一覧ページがまだ無いため null を返す
 * （呼び出し側は回答件数ピルを出さない）。
 */
export function getOpinionsLink(target: InterviewTarget): string | null {
  if (target.kind === "theme") {
    return null;
  }
  return routes.billOpinions(target.policyId);
}
