import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { ThemeCardSource } from "../../shared/utils/theme-card-view";

/**
 * TOP のテーマカードの候補（公開中の施策）を、本文・子施策・
 * つながるテーマ（完了セッション数つき）とあわせて取得する。
 * 親施策の判定（親施策がなければテーマにつながる施策に切り替える）と、
 * カードに使うテーマの選択は呼び出し側（selectTopThemeCards）で行う。
 *
 * 並び順は is_featured desc, sort_order, published_at desc（新しい順）。
 */
export async function findPublishedPoliciesWithThemes(): Promise<
  ThemeCardSource[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select(
      `
      id,
      name,
      thumbnail_url,
      parent_policy_id,
      policy_contents ( title, summary, difficulty_level ),
      child_policies:policies!parent_policy_id ( publish_status ),
      policies_interview_configs (
        interview_configs (
          id,
          name,
          slug,
          status,
          estimated_duration,
          created_at,
          participation_mode,
          allowed_provider_keys,
          interview_sessions ( count ),
          theme_voice_summaries ( status )
        )
      )
    `
    )
    .eq("publish_status", "published")
    // 「N人が参加」はインタビューを完了したセッションだけを数える
    .not(
      "policies_interview_configs.interview_configs.interview_sessions.completed_at",
      "is",
      null
    )
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch published policies: ${error.message}`);
  }

  // 自己参照の一対多（子施策）は、生成型では一対一として推論されるため配列にそろえる
  return data.map((row) => ({
    ...row,
    child_policies: toArray(row.child_policies),
  }));
}

function toArray<T>(value: T | T[] | null): T[] {
  if (value === null) return [];
  return Array.isArray(value) ? value : [value];
}
