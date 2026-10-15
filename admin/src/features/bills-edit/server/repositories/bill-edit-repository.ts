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

export async function findPolicyApproval(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select("approved_at, approved_by")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch policy approval: ${error.message}`);
  }

  return data;
}

/** 承認者（auth ユーザー）のメールアドレス。ユーザーが見つからなければ null */
export async function findAuthUserEmail(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    if (error.status === 404) return null;
    throw new Error(`Failed to fetch auth user: ${error.message}`);
  }

  return data.user.email ?? null;
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

/** 親施策の候補（親を持たない施策）を名前順で返す。excludeId の施策は除く */
export async function findTopLevelPolicies(excludeId: string | null) {
  const supabase = createAdminClient();
  let query = supabase
    .from("policies")
    .select("id, name")
    .is("parent_policy_id", null)
    .order("name");
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch top-level policies: ${error.message}`);
  }

  return data ?? [];
}

export async function findPolicyParentRef(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select("id, parent_policy_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch policy: ${error.message}`);
  }

  return data;
}

/** 子施策の数。parentId が null（新規作成中の施策）なら 0 */
export async function countChildPolicies(parentId: string | null) {
  if (parentId === null) return 0;
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("policies")
    .select("id", { count: "exact", head: true })
    .eq("parent_policy_id", parentId);

  if (error) {
    throw new Error(`Failed to count child policies: ${error.message}`);
  }

  return count ?? 0;
}
