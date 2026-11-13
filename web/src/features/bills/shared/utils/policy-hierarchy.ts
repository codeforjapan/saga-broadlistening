import { descending } from "@/features/interview-config/shared/utils/interview-theme";
import {
  isOpenInterview,
  isPublishedPolicy,
} from "@/features/interview-config/shared/utils/interview-visibility";

/**
 * 施策の親子関係（Epic #162 / #154）。
 *
 * 親施策＝親を持たず、公開中の子施策を1件以上持つ施策（例: 若者支援）。
 * 親施策はテーマの親ページとして表示し、きかせて・トピック・まとめは
 * 親施策につながるテーマ（interview_configs）に集約する。
 */

export type PolicyHierarchyRef = {
  parent_policy_id: string | null;
};

export type ChildPolicyRef = {
  publish_status: string;
};

export function isParentPolicy(
  policy: PolicyHierarchyRef,
  children: ChildPolicyRef[]
): boolean {
  return (
    policy.parent_policy_id === null &&
    children.some((child) => isPublishedPolicy(child.publish_status))
  );
}

export type ThemeCandidate = {
  id: string;
  status: string;
  created_at: string;
};

/**
 * 親施策につながるテーマのうち、親ページ・TOP で使う1件を選ぶ。
 * 下書き（draft）は公開画面に出さないので候補から外す。
 * 募集中（open）を優先し、なければ作成日時の新しいもの。同値なら ID の降順
 * （テーマ一覧の並び順 buildInterviewThemes と同じ比較）。
 */
export function selectPrimaryThemeForPolicy<T extends ThemeCandidate>(
  themes: T[]
): T | null {
  const newestFirst = themes
    .filter((theme) => theme.status !== "draft")
    .sort(
      (a, b) => descending(a.created_at, b.created_at) || descending(a.id, b.id)
    );
  return (
    newestFirst.find((theme) => isOpenInterview(theme.status)) ??
    newestFirst[0] ??
    null
  );
}

/** 施策ページの種類。親施策はテーマの親ページ、子施策は施策紹介ページとして表示する */
export type PolicyPageKind = "parent" | "child" | "standard";

/**
 * 施策ページにインタビュー導線（協力ボタン・回答方法の案内・トピック一覧・LP への誘導・
 * チャットの提案バナー）を出すか。子施策は親ページに集約するので出さない（#157）。
 */
export function shouldShowInterviewEntry(params: {
  pageKind: PolicyPageKind;
  hasInterviewConfig: boolean;
}): boolean {
  return params.pageKind !== "child" && params.hasInterviewConfig;
}
