import type { Metadata } from "next";

/** トピック分析ページのメタデータ組み立てに必要な情報。 */
type TopicPageMetadataInput = {
  /** 意見を寄せる対象の名前（施策名 or テーマ名）。 */
  subjectName: string;
  /** 対象の呼び方（「施策」/「テーマ」）。 */
  subjectKindLabel: string;
  /** 正規URL。 */
  canonical: string;
  /** OGP画像の絶対URL。 */
  shareImageUrl: string;
};

/** 施策配下・テーマ配下で共通のOGP/Twitterカード。 */
function buildShareMetadata(
  title: string,
  description: string,
  shareImageUrl: string,
  ogType: "website" | "article"
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      title,
      description,
      type: ogType,
      images: [{ url: shareImageUrl, alt: `${title} のOGPイメージ` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImageUrl],
    },
  };
}

/**
 * トピック一覧ページのメタデータ。
 * 施策配下（/bills/[id]/topics）とテーマ配下（/interviews/[slug]/topics）で共有する。
 */
export function buildTopicListMetadata({
  subjectName,
  subjectKindLabel,
  canonical,
  shareImageUrl,
}: TopicPageMetadataInput): Metadata {
  const title = `${subjectKindLabel}のトピック一覧 - ${subjectName}`;
  const description = `${subjectName}に寄せられた意見をAIが整理したトピック一覧`;

  return {
    title,
    description,
    alternates: { canonical },
    ...buildShareMetadata(title, description, shareImageUrl, "website"),
  };
}

/**
 * トピック詳細ページのメタデータ。
 * トピックが取得できない（公開版が無い・IDが無効）場合は総称のタイトルにフォールバックする。
 */
export function buildTopicDetailMetadata({
  subjectName,
  canonical,
  shareImageUrl,
  topic,
}: Omit<TopicPageMetadataInput, "subjectKindLabel"> & {
  topic: { title: string; description: string | null } | null;
}): Metadata {
  const title = topic
    ? `${topic.title} - ${subjectName}`
    : `トピック詳細 - ${subjectName}`;
  const description =
    topic?.description || `${subjectName}に寄せられた意見トピックの詳細`;

  return {
    title,
    description,
    alternates: { canonical },
    ...buildShareMetadata(title, description, shareImageUrl, "article"),
  };
}
