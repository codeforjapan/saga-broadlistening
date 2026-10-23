import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { routes } from "@/lib/routes";

/**
 * トピック分析の見出し・パンくずの起点に使う対象（施策 or テーマ）。
 * パンくずの先頭と、その下の戻りリンクに使う。href が null なら戻りリンクを出さない。
 */
export type TopicAnalysisSubject = {
  /** 表示名（パンくずの先頭にも使う） */
  name: string;
  /** 対象のページへのリンク */
  href: string | null;
};

/** 施策に紐づく意見募集の分析は、施策ページ（若者支援などの親施策を含む）を起点にする。 */
export function buildPolicyTopicSubject(policy: {
  id: string;
  name: string;
}): TopicAnalysisSubject {
  return { name: policy.name, href: routes.billDetail(policy.id) };
}

/**
 * テーマの分析は、テーマにつながる施策（親施策）を起点にする（#159）。
 * 施策につながらない抽象テーマ型は、テーマ名だけを出してリンクしない。
 */
export function buildThemeTopicSubject(theme: {
  name: string;
  policy: { id: string; name: string } | null;
}): TopicAnalysisSubject {
  return theme.policy
    ? buildPolicyTopicSubject(theme.policy)
    : { name: theme.name, href: null };
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
