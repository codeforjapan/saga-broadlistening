import {
  MAX_RELATED_POLICIES,
  RELATED_POLICY_CONTENT_MAX_CHARS,
} from "./constants";
import type { PromptRelatedPolicyInput } from "./types";

/** 施策と、指定難易度のコンテンツの埋め込み行 */
export type RelatedPolicyRow = {
  id: string;
  name: string;
  policy_contents: {
    title: string | null;
    summary: string | null;
    content: string | null;
  }[];
};

/**
 * 取得した施策をプロンプト用の形に整え、呼び出し側が渡した policyIds の順に並べる。
 *
 * DB の返却順はクエリごとに変わり得るため、プロンプト上の並びが
 * メッセージごとに入れ替わらないよう呼び出し側の順序に揃える。
 * 取得できなかった施策（非公開化・コンテンツ未作成）は落とす。
 * プロンプトが長くなりすぎないよう、件数と本文の長さに上限を置く。
 */
export function toPromptRelatedPolicies(
  policyIds: string[],
  rows: RelatedPolicyRow[]
): PromptRelatedPolicyInput[] {
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  const policies = policyIds.flatMap((id) => {
    const row = rowsById.get(id);
    const content = row?.policy_contents[0];
    if (!row || !content) {
      return [];
    }
    return [
      {
        name: row.name,
        title: content.title,
        summary: content.summary,
        content: truncatePolicyContent(content.content),
      },
    ];
  });
  return policies.slice(0, MAX_RELATED_POLICIES);
}

/** 施策の本文を上限の文字数で切り詰める。超えた分は省いたと分かるように書く */
export function truncatePolicyContent(content: string | null): string | null {
  if (!content || content.length <= RELATED_POLICY_CONTENT_MAX_CHARS) {
    return content;
  }
  return `${content.slice(0, RELATED_POLICY_CONTENT_MAX_CHARS)}…（以下略）`;
}
