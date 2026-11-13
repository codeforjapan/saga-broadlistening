import type { PublicTopic } from "../types";

/**
 * 公開トピックに意見が割り当たっている回答者（出典意見）のユニーク数。
 * トピック一覧のピルと回答一覧の「N人」を同一基準にするための純粋関数。
 */
export function countTopicRespondents(topics: PublicTopic[]): number {
  const opinionIds = new Set<string>();
  for (const topic of topics) {
    for (const opinion of topic.opinions) {
      opinionIds.add(opinion.opinion_id);
    }
  }
  return opinionIds.size;
}
