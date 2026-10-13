import type { InterviewParticipationRule } from "@mirai-gikai/shared/interview-participation/participation-mode";
import { formatEstimatedDuration } from "./format-estimated-duration";
import { formatParticipantCount } from "./interview-theme";
import { isOpenInterview } from "./interview-visibility";

/** きかせてボックスに出すテーマの取得結果（施策に埋め込んだ interview_configs 1件） */
export type KikaseteThemeSource = InterviewParticipationRule & {
  id: string;
  name: string;
  slug: string;
  status: string;
  estimated_duration: number | null;
  created_at: string;
  /** 完了したセッションの件数（埋め込み集計） */
  interview_sessions: { count: number }[];
};

/** きかせてボックスの表示用データ（利用者ごとの参加判定の前） */
export type KikaseteInterview = {
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

/** テーマ1件をきかせてボックスの表示用データに変換する */
export function toKikaseteInterview(
  theme: KikaseteThemeSource
): KikaseteInterview {
  return {
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
  };
}
