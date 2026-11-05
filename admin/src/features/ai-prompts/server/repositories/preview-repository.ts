import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import {
  type PreviewBill,
  toNormalPreviewBill,
} from "../../shared/utils/preview-data";

export async function listPublishedPreviewBillOptions() {
  const { data, error } = await createAdminClient()
    .from("policies")
    .select("id,name")
    .eq("publish_status", "published")
    .order("name");
  if (error) throw error;
  return data;
}

export async function listPublishedPreviewBills(): Promise<PreviewBill[]> {
  return listNormalPreviewBills("published");
}

async function listNormalPreviewBills(
  filter: "published" | "featured"
): Promise<PreviewBill[]> {
  const client = createAdminClient();
  const query = client
    .from("policies")
    .select(
      "id,name,is_featured,enable_ai_chat,knowledge_source,policy_contents(title,summary,content,difficulty_level),policies_tags(tags(label))"
    )
    .eq("policy_contents.difficulty_level", "normal")
    .order("published_at", { ascending: false, nullsFirst: false });
  const { data, error } = await (filter === "published"
    ? query.eq("publish_status", "published")
    : query.eq("is_featured", true));
  if (error) throw error;
  return data
    .map(toNormalPreviewBill)
    .filter((bill): bill is PreviewBill => bill !== null);
}

export async function listHomePreviewBills(): Promise<PreviewBill[]> {
  const client = createAdminClient();
  const [{ data: tags, error: tagsError }, bills, featuredBills] =
    await Promise.all([
      client
        .from("tags")
        .select("id,featured_priority")
        .not("featured_priority", "is", null)
        .order("featured_priority", { ascending: true }),
      listPublishedPreviewBills(),
      listNormalPreviewBills("featured"),
    ]);
  if (tagsError) throw tagsError;
  if (tags.length === 0) return featuredBills;
  const { data: policyTags, error: policyTagsError } = await client
    .from("policies_tags")
    .select("policy_id,tag_id")
    .in(
      "tag_id",
      tags.map((tag) => tag.id)
    );
  if (policyTagsError) throw policyTagsError;
  const grouped = tags.flatMap((tag) => {
    const ids = new Set(
      policyTags
        .filter((item) => item.tag_id === tag.id)
        .map((item) => item.policy_id)
    );
    return bills.filter((bill) => ids.has(bill.id));
  });
  return grouped.concat(featuredBills);
}

export async function findPublishedPreviewBill(
  id: string,
  difficulty: "normal" | "hard"
): Promise<PreviewBill | null> {
  const client = createAdminClient();
  const [
    { data: bill, error: billError },
    { data: content, error: contentError },
  ] = await Promise.all([
    client
      .from("policies")
      .select(
        "id,name,is_featured,enable_ai_chat,knowledge_source,policies_tags(tags(label))"
      )
      .eq("id", id)
      .eq("publish_status", "published")
      .maybeSingle(),
    client
      .from("policy_contents")
      .select("title,summary,content")
      .eq("policy_id", id)
      .eq("difficulty_level", difficulty)
      .maybeSingle(),
  ]);
  if (billError) throw billError;
  if (contentError) throw contentError;
  if (!bill) return null;
  return {
    id: bill.id,
    name: bill.name,
    title: content?.title ?? null,
    summary: content?.summary ?? null,
    content: content?.content ?? null,
    tags: bill.policies_tags.flatMap((item) =>
      item.tags ? [item.tags.label] : []
    ),
    isFeatured: bill.is_featured,
    knowledgeSource: bill.enable_ai_chat ? (bill.knowledge_source ?? "") : "",
  };
}
