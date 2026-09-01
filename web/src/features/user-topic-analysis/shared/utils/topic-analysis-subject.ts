import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { getThemeHomeLink } from "@/features/interview-config/shared/utils/interview-links";
import { routes } from "@/lib/routes";

/** トピック分析の見出し・戻り導線に使う対象（施策 or テーマ）。 */
export type TopicAnalysisSubject = {
  /** 表示名 */
  name: string;
  /** 対象のページへのリンク */
  href: string;
  /** パンくずでのラベル */
  label: string;
};

/** 施策に紐づく意見募集の分析は、施策詳細を上位階層に置く。 */
export function buildPolicyTopicSubject(policy: {
  id: string;
  name: string;
}): TopicAnalysisSubject {
  return {
    name: policy.name,
    href: routes.billDetail(policy.id),
    label: "施策詳細",
  };
}

/**
 * 抽象テーマ型の分析は、テーマの入口を上位階層に置く。
 *
 * 遷移先は意見詳細の戻り導線と同じ getThemeHomeLink に委ね、
 * ここではパンくずのラベルだけを決める（募集終了時はテーマ一覧に送られる）。
 */
export function buildThemeTopicSubject(theme: {
  slug: string;
  name: string;
  isOpen: boolean;
}): TopicAnalysisSubject {
  return {
    name: theme.name,
    href: getThemeHomeLink(theme),
    label: theme.isOpen ? "テーマ詳細" : "テーマ一覧",
  };
}

/**
 * 意見を寄せる対象の呼び方。見出しやページタイトルで「施策の〜」「テーマの〜」を出し分ける。
 */
export function getSubjectKindLabel(target: InterviewTarget): string {
  return target.kind === "theme" ? "テーマ" : "施策";
}

/** トピック一覧の見出し。何について整理した意見なのかを起点に合わせて出す。 */
export function getTopicListHeading(target: InterviewTarget): string {
  return `💬${getSubjectKindLabel(target)}のトピック一覧`;
}
