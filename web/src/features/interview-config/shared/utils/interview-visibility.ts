/** 意見募集に紐づく施策の、公開判定に必要な最小情報 */
export type LinkedPolicy = {
  id: string;
  isPublished: boolean;
};

/** PostgREST が返す「意見募集 → 施策」の埋め込み行 */
export type LinkedPolicyRow = {
  policies: { id: string; publish_status: string } | null;
};

/** 施策が市民に公開されているか */
export function isPublishedPolicy(publishStatus: string): boolean {
  return publishStatus === "published";
}

/**
 * 埋め込み結果を公開判定用の最小形に整える。
 *
 * 施策を埋め込むクエリはテーマ一覧・チャット・意見表示と複数あるため、
 * 「公開済みとは publish_status = 'published' のこと」の判断はここに一本化する。
 */
export function toLinkedPolicies(links: LinkedPolicyRow[]): LinkedPolicy[] {
  return links.flatMap((link) =>
    link.policies
      ? [
          {
            id: link.policies.id,
            isPublished: isPublishedPolicy(link.policies.publish_status),
          },
        ]
      : []
  );
}

/**
 * 募集中の意見募集を市民に見せてよいか判定する。
 *
 * 施策に紐づくテーマは、その施策が公開されるまで見せないのが従来の挙動。
 * 施策を持たない抽象テーマ型は判断材料になる施策がないため、
 * テーマが募集中であることをもって公開してよいとする。
 */
export function isInterviewVisible(
  policies: { isPublished: boolean }[]
): boolean {
  return policies.length === 0 || policies.some((policy) => policy.isPublished);
}

/**
 * 対話のプロンプトや意見の表示に使う施策を1件に決める。
 *
 * 施策と意見募集は多対多だが、複数施策を並べる設計にはなっていないため
 * 公開済みの先頭1件を採用する（複数施策表示の UI 対応は Epic #8 のフォローアップ）。
 * 公開済み施策がなければ施策なし（＝テーマだけ）として扱う。
 */
export function selectPrimaryPolicyId(policies: LinkedPolicy[]): string | null {
  return policies.find((policy) => policy.isPublished)?.id ?? null;
}

/**
 * プレビュートークンの提示先として指定された施策が、この意見募集に紐づくか検証する。
 *
 * 施策Aのトークンで、無関係な施策Bの下書きテーマを覗けないようにするためのガード。
 */
export function isLinkedPolicy(
  policies: LinkedPolicy[],
  policyId: string
): boolean {
  return policies.some((policy) => policy.id === policyId);
}
