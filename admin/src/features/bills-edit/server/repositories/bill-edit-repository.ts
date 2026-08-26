import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
// Epic #54 で参照先が bills/bill_contents/bills_tags → policies 系になった。
// bill という名前の改名は Epic #8 完了後のフォローアップで行う。
import type { BillInsert } from "../../shared/types";
import type { DifficultyLevel } from "../../shared/types/bill-contents";

export async function findBillById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch bill: ${error.message}`);
  }

  return data;
}

export async function findBillContentsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policy_contents")
    .select("*")
    .eq("policy_id", billId)
    .order("difficulty_level");

  if (error) {
    throw new Error(`Failed to fetch bill contents: ${error.message}`);
  }

  return data ?? [];
}

export async function findBillTagIdsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_tags")
    .select("tag_id")
    .eq("policy_id", billId);

  if (error) {
    throw new Error(`Failed to fetch bill tag ids: ${error.message}`);
  }

  return data?.map((item) => item.tag_id) ?? [];
}

export async function findBillBySlug(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    throw new Error(`Failed to fetch bill by slug: ${error.message}`);
  }

  return data;
}

export async function createBillRecord(insertData: BillInsert) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create bill: ${error.message}`);
  }

  return data;
}

export async function updateBillRecord(
  id: string,
  updateData: Record<string, unknown>
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("policies")
    .update(updateData)
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update bill: ${error.message}`);
  }
}

export async function upsertBillContent(params: {
  billId: string;
  difficultyLevel: DifficultyLevel;
  title: string;
  summary: string;
  content: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("policy_contents").upsert(
    {
      policy_id: params.billId,
      difficulty_level: params.difficultyLevel,
      title: params.title,
      summary: params.summary,
      content: params.content,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "policy_id,difficulty_level",
    }
  );

  if (error) {
    throw new Error(
      `Failed to upsert bill content (${params.difficultyLevel}): ${error.message}`
    );
  }
}

export async function findBillsTagsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_tags")
    .select("tag_id")
    .eq("policy_id", billId);

  if (error) {
    throw new Error(`Failed to fetch bill tags: ${error.message}`);
  }

  return data?.map((t) => t.tag_id) ?? [];
}

export async function deleteBillsTags(billId: string, tagIds: string[]) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("policies_tags")
    .delete()
    .eq("policy_id", billId)
    .in("tag_id", tagIds);

  if (error) {
    throw new Error(`Failed to delete bill tags: ${error.message}`);
  }
}

export async function createBillsTags(billId: string, tagIds: string[]) {
  const supabase = createAdminClient();
  const billTags = tagIds.map((tagId) => ({
    policy_id: billId,
    tag_id: tagId,
  }));

  const { error } = await supabase.from("policies_tags").insert(billTags);

  if (error) {
    throw new Error(`Failed to create bill tags: ${error.message}`);
  }
}
