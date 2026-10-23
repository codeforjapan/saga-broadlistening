/**
 * AIインタビューの参加導線の起点。
 *
 * 施策ページから入る従来の導線（policy）と、施策に紐づかない
 * 抽象テーマ型のためのテーマ単独の導線（theme）の2種類がある。
 * LP・情報開示・チャットのURLはこの型から組み立てる。
 */
export type InterviewTarget =
  | {
      kind: "policy";
      policyId: string;
      /** 未公開施策を職員が確認するためのプレビュートークン */
      previewToken?: string;
    }
  | { kind: "theme"; slug: string };

export function policyInterviewTarget(
  policyId: string,
  previewToken?: string
): InterviewTarget {
  return { kind: "policy", policyId, previewToken };
}

export function themeInterviewTarget(slug: string): InterviewTarget {
  return { kind: "theme", slug };
}

/**
 * 職員プレビューからの操作に添える資格情報。
 * 施策経由でプレビュートークンを持つときだけ返す（それ以外は undefined）
 */
export function previewCredentialOf(
  target: InterviewTarget
): { policyId: string; token: string } | undefined {
  return target.kind === "policy" && target.previewToken
    ? { policyId: target.policyId, token: target.previewToken }
    : undefined;
}
