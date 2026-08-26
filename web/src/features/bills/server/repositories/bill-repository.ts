import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { groupTagsByBillId } from "../../shared/utils/group-tags";

// Epic #54 でテーブルが bills → policies / bill_contents → policy_contents /
// bills_tags → policies_tags に再定義された。
// ファイル名・関数名（bill-repository / find*Bill*）の改名は Epic #8 完了後のフォローアップ。

// ============================================================
// Policies
// ============================================================

/**
 * 公開済み施策を難易度コンテンツ付きで取得
 */
export async function findPublishedBillsWithContents(
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select(
      `
      *,
      policy_contents!inner (
        id,
        policy_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      )
    `
    )
    .eq("publish_status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .eq("policy_contents.difficulty_level", difficultyLevel);

  if (error) {
    throw new Error(`Failed to fetch policies: ${error.message}`);
  }

  return data;
}

/**
 * 公開済み施策を1件取得
 */
export async function findPublishedBillById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .eq("publish_status", "published")
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * 管理者用: ステータス問わず施策を1件取得
 */
export async function findBillById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * 施策のタグを取得
 */
export async function findTagsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_tags")
    .select("tags(id, label)")
    .eq("policy_id", billId);

  if (error) {
    return null;
  }

  return data;
}

// ============================================================
// Policy Contents
// ============================================================

/**
 * 指定された難易度の施策コンテンツを取得
 */
export async function findBillContentByDifficulty(
  billId: string,
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policy_contents")
    .select("*")
    .eq("policy_id", billId)
    .eq("difficulty_level", difficultyLevel)
    .single();

  if (error) {
    console.error(`Failed to fetch policy content: ${error.message}`);
    return null;
  }

  return data;
}

// ============================================================
// Tags (bulk)
// ============================================================

/**
 * 複数のpolicy_idに紐づくタグを一括取得し、policy_idごとにグループ化して返す
 */
export async function findTagsByBillIds(
  billIds: string[]
): Promise<Map<string, Array<{ id: string; label: string }>>> {
  if (billIds.length === 0) {
    return new Map();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_tags")
    .select("policy_id, tags(id, label)")
    .in("policy_id", billIds);

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  return groupTagsByBillId(data ?? []);
}

// ============================================================
// Featured
// ============================================================

/**
 * featured_priorityが設定されているタグを取得
 */
export async function findFeaturedTags() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, label, description, featured_priority")
    .not("featured_priority", "is", null)
    .order("featured_priority", { ascending: true });

  if (error) {
    console.error("Failed to fetch featured tags:", error);
    return [];
  }

  return data ?? [];
}

/**
 * 特定タグに紐づく公開済み施策を取得（policy_contents + タグ付き）
 */
export async function findPublishedBillsByTag(
  tagId: string,
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_tags")
    .select(
      `
      policy_id,
      policies!inner (
        *,
        policy_contents!inner (
          id,
          policy_id,
          title,
          summary,
          content,
          difficulty_level,
          created_at,
          updated_at
        ),
        policies_tags!inner (
          tags (
            id,
            label
          )
        )
      )
    `
    )
    .eq("tag_id", tagId)
    .eq("policies.publish_status", "published")
    .eq("policies.policy_contents.difficulty_level", difficultyLevel);

  if (error) {
    console.error(`Failed to fetch policies for tag:`, error);
    return null;
  }

  return data;
}

/**
 * 注目の施策を取得（is_featured = true）
 */
export async function findFeaturedBillsWithContents(
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select(
      `
      *,
      policy_contents!inner (
        id,
        policy_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      ),
      tags:policies_tags(
        tag:tags(
          id,
          label
        )
      )
    `
    )
    .eq("is_featured", true)
    .eq("policy_contents.difficulty_level", difficultyLevel)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Failed to fetch featured policies:", error);
    return [];
  }

  return data ?? [];
}

// ============================================================
// Preview Tokens
// ============================================================

/**
 * プレビュートークンを検証
 */
export async function findPreviewToken(billId: string, token: string) {
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

// ============================================================
// Interview Status
// ============================================================

/**
 * 複数のpolicy_idに対して、募集中の意見募集があるかを一括判定
 *
 * 施策と意見募集は policies_interview_configs による多対多。
 * status="open"（旧 "public"）のものだけを対象にする。
 */
export async function findBillIdsWithPublicInterview(
  billIds: string[]
): Promise<Set<string>> {
  if (billIds.length === 0) {
    return new Set();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_interview_configs")
    .select("policy_id, interview_configs!inner(status)")
    .in("policy_id", billIds)
    .eq("interview_configs.status", "open");

  if (error) {
    console.error("Failed to fetch interview configs:", error);
    return new Set();
  }

  return new Set(data.map((row) => row.policy_id));
}
