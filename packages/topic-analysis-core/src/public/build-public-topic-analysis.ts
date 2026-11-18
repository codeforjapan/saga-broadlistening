import { normalizeRoleTitle } from "./normalize-role-title";
import type {
  PublicOpinion,
  PublicTopic,
  PublicTopicAnalysis,
  PublishedVersionMeta,
  RawOpinionRow,
  RawTopicRow,
} from "./public-types";

/**
 * §8 表示時フィルタの最終ゲート: 公開済み（review_status='published'）×
 * モデレーションOK のみ通す。分析後に職員が非公開化・ユーザーが同意撤回した
 * 意見は即座に除外される。
 * web 公開ページのデフォルト述語。内部用途では別の述語を渡して上書きできる。
 */
export function isDisplayable(o: RawOpinionRow): boolean {
  return o.review_status === "published" && o.moderation_status === "ok";
}

/**
 * 公開中 version の生データ（§8 未フィルタ）から、表示用レスポンス（§13 A.4）を構築する純粋関数。
 *
 * - 各論点を §8（review_status='published' × moderation_status='ok'）でフィルタ。
 * - 件数は **フィルタ後の集合から再計算**（保存値は使わない・§8）。
 * - フィルタ後に論点が0件になったトピックは応答に含めない。
 * - 未分類（topic 未割当）の論点はそもそも topic 配下に無いため自然に除外される（§9）。
 * - total_opinions はフィルタ後・トピック割当済みの論点総数。
 */
export function buildPublicTopicAnalysis(
  meta: PublishedVersionMeta,
  rawTopics: RawTopicRow[],
  // 含める論点の述語。デフォルトは web 公開ページの §8 フィルタ。
  // 内部用途（admin MCP）では任意の述語を渡して取得条件を変えられる。
  includeOpinion: (o: RawOpinionRow) => boolean = isDisplayable
): PublicTopicAnalysis {
  const topics: PublicTopic[] = [];
  let totalOpinions = 0;

  for (const rawTopic of rawTopics) {
    // フィルタ後、richness（情報充実度）降順で並べる。
    // 充実した引用が先頭になり、カード・詳細ともに優先表示される。
    // null（未生成）は最後尾。同点は元順序（opinion_id, opinion_index）を保つ
    // ＝ V8 の安定ソートに依存。集計（件数）は順序の影響を受けない。
    const displayable = rawTopic.opinions
      .filter(includeOpinion)
      .slice()
      .sort((a, b) => (b.richness ?? -1) - (a.richness ?? -1));
    if (displayable.length === 0) {
      // フィルタで全件消えたトピックはカードを作らない（§8/§9）
      continue;
    }

    const opinions: PublicOpinion[] = displayable.map((o) => ({
      id: o.id,
      opinion_id: o.opinion_id,
      opinion_public: o.review_status === "published",
      created_at: o.created_at,
      title: o.title,
      content: o.content,
      role_title: normalizeRoleTitle(o.role_title),
      contextual_quote: o.contextual_quote,
      richness: o.richness,
      source_message_id: o.source_message_id,
      question_snippet: null,
    }));

    totalOpinions += displayable.length;
    topics.push({
      id: rawTopic.id,
      title: rawTopic.title,
      description: rawTopic.description,
      opinion_count: displayable.length,
      opinions,
    });
  }

  // 2階層化で topic.sort_order の意味が「全トピックの件数降順」から
  // 「大トピック → 配下の中トピック」の深さ優先順に変わった。公開ページは階層を
  // 持たないフラット表示なので、ここで件数降順に並べ直して従来の並びを保つ。
  // 同数は sort_order（＝階層内の並び）で安定させる。
  topics.sort((a, b) => b.opinion_count - a.opinion_count);

  return {
    interview_config_id: meta.interview_config_id,
    version: meta.version,
    generated_at: meta.generated_at,
    total_opinions: totalOpinions,
    topics,
  };
}
