import type { InterviewTheme } from "../types/interview-theme";

/** テーマにも施策にも画像がないときに使う既定の画像 */
export const DEFAULT_INTERVIEW_THUMBNAIL =
  "/illustrations/interview-illustration.png";

/** buildInterviewThemes の入力。施策 ↔ 意見募集の紐付け1行に対応する */
export type InterviewThemeLinkRow = {
  policyId: string;
  /** 紐付け行の作成日時。施策からテーマを1件に決めるときの並び順に使う */
  linkedAt: string;
  policyThumbnailUrl: string | null;
  /** 施策の代表タグ。カードのカテゴリ表示に使う */
  policyTagLabel: string | null;
  config: {
    id: string;
    name: string;
    description: string | null;
    estimatedDuration: number | null;
    thumbnailUrl: string | null;
    createdAt: string;
    participantCount: number;
  };
};

/** 文字列の降順比較。同値なら 0 */
function descending(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? 1 : -1;
}

/**
 * 紐付け行を並べ替える。
 *
 * 施策から意見募集を1件に決める順序（interview-config-repository の
 * findNewestInterviewConfigByPolicyId）と揃える。
 * ここがずれると、カードから開いた LP に別のテーマが出る。
 */
function compareLinkRows(a: InterviewThemeLinkRow, b: InterviewThemeLinkRow) {
  return (
    descending(a.linkedAt, b.linkedAt) || descending(a.config.id, b.config.id)
  );
}

/**
 * 紐付け行からテーマ一覧を組み立てる。
 *
 * 1施策に募集中のテーマが複数あると、LP は上の並び順で最初の1件しか出せない。
 * カードの遷移先と表示内容を一致させるため、「その施策を開いたときに実際に
 * 出るテーマ」だけを残し、どの施策からも辿り着けないテーマは落とす。
 * （テーマ単独の参加URLができれば、この絞り込みは不要になる）
 *
 * 並び順はテーマの作成日時の新しい順。
 */
export function buildInterviewThemes(
  rows: InterviewThemeLinkRow[]
): InterviewTheme[] {
  const sortedRows = [...rows].sort(compareLinkRows);

  const seenPolicyIds = new Set<string>();
  const entries = new Map<
    string,
    { createdAt: string; theme: InterviewTheme }
  >();

  for (const row of sortedRows) {
    // 施策ごとの先頭行だけが、その施策を開いたときに実際に出るテーマ
    if (seenPolicyIds.has(row.policyId)) {
      continue;
    }
    seenPolicyIds.add(row.policyId);

    if (entries.has(row.config.id)) {
      continue;
    }

    entries.set(row.config.id, {
      createdAt: row.config.createdAt,
      theme: {
        id: row.config.id,
        name: row.config.name,
        description: row.config.description,
        estimatedDuration: row.config.estimatedDuration,
        thumbnailUrl:
          row.config.thumbnailUrl ??
          row.policyThumbnailUrl ??
          DEFAULT_INTERVIEW_THUMBNAIL,
        participantCount: row.config.participantCount,
        categoryLabel: row.policyTagLabel,
        policyId: row.policyId,
      },
    });
  }

  return [...entries.values()]
    .sort(
      (a, b) =>
        descending(a.createdAt, b.createdAt) ||
        descending(a.theme.id, b.theme.id)
    )
    .map((entry) => entry.theme);
}

/**
 * 参加人数の表示テキスト。
 * 0人のときは null を返し、表示しない判断を呼び出し側に委ねる。
 */
export function formatParticipantCount(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return `${count.toLocaleString("ja-JP")}人が参加`;
}
