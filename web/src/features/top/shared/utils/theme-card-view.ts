import type { InterviewParticipationRule } from "@mirai-gikai/shared/interview-participation/participation-mode";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import {
  isParentPolicy,
  selectPrimaryThemeForPolicy,
} from "@/features/bills/shared/utils/policy-hierarchy";
import { formatEstimatedDuration } from "@/features/interview-config/shared/utils/format-estimated-duration";
import {
  formatParticipantCount,
  resolveInterviewThumbnail,
} from "@/features/interview-config/shared/utils/interview-theme";
import { isOpenInterview } from "@/features/interview-config/shared/utils/interview-visibility";

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
    interview_configs: ThemeCardInterviewSource | null;
  }[];
};

export type ThemeCardInterviewSource = InterviewParticipationRule & {
  id: string;
  name: string;
  slug: string;
  status: string;
  estimated_duration: number | null;
  created_at: string;
  /** 完了したセッションの件数（埋め込み集計） */
  interview_sessions: { count: number }[];
};

/** テーマカードのきかせて枠に出す情報 */
export type ThemeCardInterview = {
  slug: string;
  /** 問いかけ（例: 「若者支援について、あなたの経験や考えを聞かせてください」） */
  prompt: string;
  durationLabel: string | null;
  participantLabel: string | null;
  /** 募集中でなければ「はじめる」を押せない状態で出す */
  isOpen: boolean;
  /** 参加条件（スーパーアプリ連携 #145）。判定は利用者ごとに行う */
  participationRule: InterviewParticipationRule & { name: string };
};

export type ThemeCardView = {
  policyId: string;
  policyName: string;
  bannerSrc: string;
  title: string;
  summary: string | null;
  interview: ThemeCardInterview | null;
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
    interview: theme
      ? {
          slug: theme.slug,
          prompt: `${theme.name}について、あなたの経験や考えを聞かせてください`,
          durationLabel: formatEstimatedDuration(theme.estimated_duration),
          participantLabel: formatParticipantCount(
            theme.interview_sessions[0]?.count ?? 0
          ),
          isOpen: isOpenInterview(theme.status),
          participationRule: {
            name: theme.name,
            participation_mode: theme.participation_mode,
            allowed_provider_keys: theme.allowed_provider_keys,
          },
        }
      : null,
  };
}
