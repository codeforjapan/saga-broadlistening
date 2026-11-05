export function toHomeChatContext(input: {
  policyName: string;
  title: string | null | undefined;
  summary: string | null | undefined;
  tags: string[];
  isFeatured: boolean;
}) {
  return {
    name: `${input.title}（${input.policyName}）`,
    summary: input.summary ?? undefined,
    tags: input.tags,
    isFeatured: input.isFeatured,
  };
}
