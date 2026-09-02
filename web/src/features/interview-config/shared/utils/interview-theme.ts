import type { InterviewTheme } from "../types/interview-theme";
import { getThemeCardLink } from "./interview-links";
import { isInterviewVisible, isPublishedPolicy } from "./interview-visibility";

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

/** テーマ一覧の取得結果1行（PostgREST の埋め込み結果そのまま） */
export type InterviewConfigListRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  estimated_duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  interview_sessions: { count: number }[];
  policies_interview_configs: {
    policies: {
      publish_status: string;
      thumbnail_url: string | null;
      policies_tags: { tags: { label: string } | null }[];
    } | null;
  }[];
};

/**
 * 取得結果をカード表示用の行に整える。
 * 施策は画像・カテゴリのフォールバック元と公開判定にだけ使うので、
 * 公開済みかどうかの判定は他の導線と同じ規則（isPublishedPolicy）に揃える。
 */
export function toInterviewThemeRows(
  configs: InterviewConfigListRow[]
): InterviewThemeRow[] {
  return configs.map((config) => ({
    id: config.id,
    slug: config.slug,
    name: config.name,
    description: config.description,
    estimatedDuration: config.estimated_duration,
    thumbnailUrl: config.thumbnail_url,
    createdAt: config.created_at,
    participantCount: config.interview_sessions[0]?.count ?? 0,
    policies: config.policies_interview_configs.flatMap((link) =>
      link.policies
        ? [
            {
              isPublished: isPublishedPolicy(link.policies.publish_status),
              thumbnailUrl: link.policies.thumbnail_url,
              tagLabel: link.policies.policies_tags[0]?.tags?.label ?? null,
            },
          ]
        : []
    ),
  }));
}

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
 * テーマ行から、一覧に出すテーマを組み立てる（募集中・募集終了で共通）。
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

/** テーマカードの用途。参加してもらうか、結果を読ませるか。 */
export type InterviewThemeCardPurpose = "participate" | "results";

/** テーマカードの遷移先とCTAラベル。 */
export type InterviewThemeCardAction = {
  href: string;
  ctaLabel: string;
};

/**
 * テーマカードの遷移先とCTAラベルを決める。
 * 遷移先の判断は getThemeCardLink に委ね、ここでは文言だけを決める。
 */
export function buildInterviewThemeCardAction(
  slug: string,
  purpose: InterviewThemeCardPurpose
): InterviewThemeCardAction {
  const isOpen = purpose === "participate";
  return {
    href: getThemeCardLink({ slug, isOpen }),
    ctaLabel: isOpen ? "はじめる" : "結果を見る",
  };
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
