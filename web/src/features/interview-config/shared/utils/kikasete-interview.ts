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
  /** みんなの声のまとめ（版ごと）。公開中があるかだけを見る */
  theme_voice_summaries: { status: string }[];
};

/** きかせてボックスの表示用データ（利用者ごとの参加判定の前） */
export type KikaseteInterview = {
  slug: string;
  /**
   * 問いかけ（例: 「若者支援について、あなたの経験や考えを聞かせてください」）。
   * 募集が終わったテーマでは終了の案内にする
   */
  prompt: string;
  durationLabel: string | null;
  participantLabel: string | null;
  /** 募集中でなければ「はじめる」の代わりに「結果を見る」を出す */
  isOpen: boolean;
  /** 公開中のみんなの声のまとめがあるか（「結果を見る」の遷移先を決める） */
  hasPublishedSummary: boolean;
  /** 参加条件（スーパーアプリ連携 #145）。判定は利用者ごとに行う */
  participationRule: InterviewParticipationRule & { name: string };
};

/** テーマ1件をきかせてボックスの表示用データに変換する */
export function toKikaseteInterview(
  theme: KikaseteThemeSource
): KikaseteInterview {
  const isOpen = isOpenInterview(theme.status);
  const subject = stripAbout(theme.name);
  return {
    slug: theme.slug,
    prompt: isOpen
      ? `${subject}について、あなたの経験や考えを聞かせてください`
      : `${subject}についての意見募集は終了しました`,
    durationLabel: formatEstimatedDuration(theme.estimated_duration),
    participantLabel: formatParticipantCount(
      theme.interview_sessions[0]?.count ?? 0
    ),
    isOpen,
    hasPublishedSummary: theme.theme_voice_summaries.some(
      (summary) => summary.status === "published"
    ),
    participationRule: {
      name: theme.name,
      participation_mode: theme.participation_mode,
      allowed_provider_keys: theme.allowed_provider_keys,
    },
  };
}

/** テーマ名が「〜について」で終わるとき、問いかけが「〜についてについて」にならないよう外す */
export function stripAbout(name: string): string {
  return name.replace(/について$/, "");
}
