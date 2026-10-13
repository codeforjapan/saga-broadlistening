import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import {
  isParentPolicy,
  selectPrimaryThemeForPolicy,
} from "@/features/bills/shared/utils/policy-hierarchy";
import { resolveInterviewThumbnail } from "@/features/interview-config/shared/utils/interview-theme";
import {
  type KikaseteInterview,
  type KikaseteThemeSource,
  toKikaseteInterview,
} from "@/features/interview-config/shared/utils/kikasete-interview";

/** テーマが4件以上になったら2カラムのグリッドにする（デザインの付箋） */
const THEME_GRID_MIN_COUNT = 4;

export function usesThemeGrid(themeCount: number): boolean {
  return themeCount >= THEME_GRID_MIN_COUNT;
}

/** toThemeCardView の入力（リポジトリの取得結果1行） */
export type ThemeCardSource = {
  id: string;
  name: string;
  thumbnail_url: string | null;
  parent_policy_id: string | null;
  policy_contents: {
    title: string;
    summary: string | null;
    difficulty_level: DifficultyLevelEnum;
  }[];
  child_policies: { publish_status: string }[];
  policies_interview_configs: {
    interview_configs: KikaseteThemeSource | null;
  }[];
};

export type ThemeCardView = {
  policyId: string;
  policyName: string;
  bannerSrc: string;
  title: string;
  summary: string | null;
  interview: KikaseteInterview | null;
};

/**
 * 親施策1件をテーマカードの表示用データに変換する。親施策でなければ null。
 *
 * 見出し・説明文は表示中の難易度の本文から取り、なければ「ふつう」の本文を使う。
 * 本文がなければ施策名を見出しにする。
 */
export function toThemeCardView(
  source: ThemeCardSource,
  difficulty: DifficultyLevelEnum
): ThemeCardView | null {
  if (!isParentPolicy(source, source.child_policies)) {
    return null;
  }

  const content =
    source.policy_contents.find((c) => c.difficulty_level === difficulty) ??
    source.policy_contents.find((c) => c.difficulty_level === "normal") ??
    null;

  const theme = selectPrimaryThemeForPolicy(
    source.policies_interview_configs.flatMap((link) =>
      link.interview_configs ? [link.interview_configs] : []
    )
  );

  return {
    policyId: source.id,
    policyName: source.name,
    bannerSrc: resolveInterviewThumbnail(source.thumbnail_url, null),
    title: content?.title ?? source.name,
    summary: content?.summary ?? null,
    interview: theme ? toKikaseteInterview(theme) : null,
  };
}
