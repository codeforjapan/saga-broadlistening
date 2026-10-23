import { descending } from "@/features/interview-config/shared/utils/interview-theme";

/** 親施策ページの「関連施策」カード */
export type ChildPolicyCardView = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  /** タグ名順で最初のタグ（「施策紹介 · 奨学金返済」の後半） */
  tagLabel: string | null;
};

type ChildPolicySource = {
  id: string;
  name: string;
  thumbnail_url: string | null;
  policies_tags: { tags: { label: string } | null }[];
};

export function toChildPolicyCardView(
  source: ChildPolicySource
): ChildPolicyCardView {
  const labels = source.policies_tags
    .flatMap((link) => (link.tags ? [link.tags.label] : []))
    // 実行環境のロケールに左右されないよう、文字コード順（昇順）で並べる
    .sort((a, b) => descending(b, a));
  return {
    id: source.id,
    name: source.name,
    thumbnailUrl: source.thumbnail_url,
    tagLabel: labels[0] ?? null,
  };
}
