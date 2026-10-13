import {
  parseRelatedLinks,
  RELATED_LINK_KIND_LABELS,
  type RelatedLinkKind,
} from "@mirai-gikai/shared/policy/related-links";

export type RelatedLinkView = {
  label: string;
  url: string;
  kind: RelatedLinkKind;
  /** 種別の表示名（「施策詳細ページ」「佐賀市HP」） */
  kindLabel: string;
  /** URL のドメイン（例: www.city.saga.lg.jp） */
  domain: string;
};

/** policies.related_links（jsonb）を関連リンクの表示用データに変換する。形の合わない要素は捨てる */
export function toRelatedLinkViews(value: unknown): RelatedLinkView[] {
  return parseRelatedLinks(value).map((link) => ({
    ...link,
    kindLabel: RELATED_LINK_KIND_LABELS[link.kind],
    domain: new URL(link.url).hostname,
  }));
}
