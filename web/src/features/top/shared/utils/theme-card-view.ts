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
 * TOP のテーマカードを、取得した公開中の施策（並び順どおり）から選んで作る。
 *
 * - 親施策（公開中の子を持つ施策）が1件でもあれば、親施策ごとに1枚（#155 の仕様）。
 * - 1件もなければ、テーマにつながる施策ごとに1枚。親子関係を使わない自治体でも
 *   TOP が空にならないようにする（親子関係は任意。FORK_GUIDELINES.md）。
 *
 * テーマにつながらない施策は、親施策でない限りカードにしない。
 */
export function selectTopThemeCards(
  sources: ThemeCardSource[],
  difficulty: DifficultyLevelEnum
): ThemeCardView[] {
  const parents = sources.filter((source) =>
    isParentPolicy(source, source.child_policies)
  );
  if (parents.length > 0) {
    return parents.map((source) => toThemeCardView(source, difficulty));
  }
  return sources
    .map((source) => toThemeCardView(source, difficulty))
    .filter((view) => view.interview !== null);
}

/**
 * 施策1件をテーマカードの表示用データに変換する。
 *
 * 見出し・説明文は表示中の難易度の本文から取り、なければ「ふつう」の本文を使う。
 * 本文がなければ施策名を見出しにする。
 */
export function toThemeCardView(
  source: ThemeCardSource,
  difficulty: DifficultyLevelEnum
): ThemeCardView {
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
