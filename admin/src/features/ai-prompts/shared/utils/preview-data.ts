export type PreviewBill = {
  id: string;
  name: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  tags: string[];
  isFeatured: boolean;
  knowledgeSource: string;
};

export function toNormalPreviewBill(row: {
  id: string;
  name: string;
  is_featured: boolean;
  enable_ai_chat: boolean;
  knowledge_source: string | null;
  policy_contents: {
    title: string;
    summary: string | null;
    content: string | null;
    difficulty_level: string;
  }[];
  policies_tags: { tags: { label: string } | null }[];
}): PreviewBill | null {
  const content = row.policy_contents.find(
    (item) => item.difficulty_level === "normal"
  );
  if (!content) return null;
  return {
    id: row.id,
    name: row.name,
    title: content.title,
    summary: content.summary,
    content: content.content,
    tags: row.policies_tags.flatMap((item) =>
      item.tags ? [item.tags.label] : []
    ),
    isFeatured: row.is_featured,
    knowledgeSource: row.enable_ai_chat ? (row.knowledge_source ?? "") : "",
  };
}

export function toBillPromptVariables(bill: PreviewBill) {
  return {
    billName: bill.name,
    billTitle: bill.title ?? "",
    billSummary: bill.summary ?? "",
    billContent: bill.content ?? "",
    knowledgeSource: bill.knowledgeSource,
  };
}
