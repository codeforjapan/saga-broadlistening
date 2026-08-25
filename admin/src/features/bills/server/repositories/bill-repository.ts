import "server-only";
import type { Database } from "@mirai-gikai/supabase";
import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  BillInsert,
  BillPublishStatus,
  BillSortConfig,
} from "../../shared/types";

// Epic #54 で参照先が bills → policies になった。bill という名前の
// 改名は Epic #8 完了後のフォローアップで行う。
type BillContentInsert =
  Database["public"]["Tables"]["policy_contents"]["Insert"];

export async function findBills(sortConfig?: BillSortConfig) {
  const supabase = createAdminClient();
  const field = sortConfig?.field ?? "created_at";
  const ascending = (sortConfig?.order ?? "desc") === "asc";

  const orderOptions: { ascending: boolean; nullsFirst?: boolean } = {
    ascending,
  };

  if (field === "published_at") {
    orderOptions.nullsFirst = false;
  }

  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .order(field, orderOptions);

  if (error) {
    throw new Error(`Failed to fetch bills: ${error.message}`);
  }
  return data;
}

export async function findBillById(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("id", billId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch bill: ${error.message}`);
  }
  return data;
}

export async function createBill(insertData: BillInsert) {
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

export async function deleteBillById(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("policies").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete bill: ${error.message}`);
  }
}

export async function updateBillPublishStatus(
  billId: string,
  publishStatus: BillPublishStatus
) {
  const supabase = createAdminClient();
  // published へ変更した時点で published_at を必ず埋める（DB の CHECK 制約）
  const { error } = await supabase
    .from("policies")
    .update(
      publishStatus === "published"
        ? {
            publish_status: publishStatus,
            published_at: new Date().toISOString(),
          }
        : { publish_status: publishStatus }
    )
    .eq("id", billId);

  if (error) {
    throw new Error(`Failed to update bill publish status: ${error.message}`);
  }
}

export async function findBillContentsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policy_contents")
    .select("*")
    .eq("policy_id", billId);

  if (error) {
    throw new Error(`Failed to fetch bill contents: ${error.message}`);
  }
  return data;
}

export async function createBillContents(contents: BillContentInsert[]) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("policy_contents").insert(contents);

  if (error) {
    throw new Error(`Failed to create bill contents: ${error.message}`);
  }
}

export async function findPreviewToken(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("preview_tokens")
    .select("token, expires_at")
    .eq("policy_id", billId)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

export async function createPreviewToken(params: {
  billId: string;
  token: string;
  expiresAt: string;
  createdBy: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("preview_tokens").insert({
    policy_id: params.billId,
    token: params.token,
    expires_at: params.expiresAt,
    created_by: params.createdBy,
  });

  if (error) {
    throw new Error(`Failed to insert preview token: ${error.message}`);
  }
}

export async function deletePreviewTokenByBillId(billId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("preview_tokens")
    .delete()
    .eq("policy_id", billId);

  if (error) {
    throw new Error(`Failed to delete preview token: ${error.message}`);
  }
}

export async function findPreviewTokenForValidation(
  billId: string,
  token: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("preview_tokens")
    .select("expires_at")
    .eq("policy_id", billId)
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}
