import type { InterviewTheme } from "../types/interview-theme";
import { isInterviewVisible } from "./interview-visibility";

/** テーマにも施策にも画像がないときに使う既定の画像 */
export const DEFAULT_INTERVIEW_THUMBNAIL =
  "/illustrations/interview-illustration.png";

/** buildInterviewThemes の入力。募集中の意見募集1件に対応する */
export type InterviewThemeRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  estimatedDuration: number | null;
  thumbnailUrl: string | null;
  createdAt: string;
  participantCount: number;
  /** 紐づく施策。抽象テーマ型では空配列 */
  policies: {
    isPublished: boolean;
    thumbnailUrl: string | null;
    /** 施策の代表タグ。カードのカテゴリ表示に使う */
    tagLabel: string | null;
  }[];
};

/** 文字列の降順比較。同値なら 0 */
function descending(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? 1 : -1;
}

/**
 * テーマの画像を決める。
 *
 * テーマ自身の画像を最優先し、なければ紐づく施策の画像、それもなければ既定の画像。
 * 一覧のカードとテーマのLPで見え方が食い違わないよう、両方からこれを使う。
 */
export function resolveInterviewThumbnail(
  themeThumbnailUrl: string | null | undefined,
  policyThumbnailUrl: string | null | undefined
): string {
  return themeThumbnailUrl ?? policyThumbnailUrl ?? DEFAULT_INTERVIEW_THUMBNAIL;
}

/**
 * 募集中のテーマ行から、一覧に出すテーマを組み立てる。
 *
 * 画像とカテゴリは「テーマ自身 → 公開済み施策 → 既定」の順にフォールバックする。
 * 並び順はテーマの作成日時の新しい順、同値ならID降順。
 */
export function buildInterviewThemes(
  rows: InterviewThemeRow[]
): InterviewTheme[] {
  return rows
    .filter((row) => isInterviewVisible(row.policies))
    .sort(
      (a, b) => descending(a.createdAt, b.createdAt) || descending(a.id, b.id)
    )
    .map((row) => {
      const publishedPolicies = row.policies.filter(
        (policy) => policy.isPublished
      );

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        estimatedDuration: row.estimatedDuration,
        thumbnailUrl: resolveInterviewThumbnail(
          row.thumbnailUrl,
          publishedPolicies.find((policy) => policy.thumbnailUrl)?.thumbnailUrl
        ),
        participantCount: row.participantCount,
        categoryLabel:
          publishedPolicies.find((policy) => policy.tagLabel)?.tagLabel ?? null,
      };
    });
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
