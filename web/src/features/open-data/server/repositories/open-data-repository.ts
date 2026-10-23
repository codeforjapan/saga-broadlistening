import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { OpenDataCursor } from "../../shared/utils/cursor";

export type OpenDataReportRow = {
  opinion_id: string;
  interview_config_id: string;
  interview_config_name: string;
  role_title: string | null;
  role_description: string | null;
  summary: string | null;
  final_text: string;
  interview_session_id: string;
  created_at: string;
};

/**
 * 二次利用許諾済みの公開意見を新しい順に取得する。
 * フィルタ条件（公開状態 × 二次利用許諾 × 意見募集の公開 × k-匿名性ゲート）は
 * DB function 側に集約している。
 */
export async function findOpenDataReports(params: {
  minPublicOpinions: number;
  limit: number;
  cursor: OpenDataCursor | null;
}): Promise<OpenDataReportRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("find_open_data_opinions", {
    p_min_public_opinions: params.minPublicOpinions,
    p_limit: params.limit,
    ...(params.cursor
      ? {
          p_cursor_created_at: params.cursor.createdAt,
          p_cursor_id: params.cursor.id,
        }
      : {}),
  });

  if (error) {
    throw new Error(`Failed to fetch open data opinions: ${error.message}`);
  }
  return data ?? [];
}

export type OpenDataMessageRow = {
  interview_session_id: string;
  role: "assistant" | "user";
  content: string;
};

/**
 * セッションIDの集合に対する会話ログを作成日時昇順で取得する。
 */
export async function findMessagesBySessionIds(
  sessionIds: string[]
): Promise<OpenDataMessageRow[]> {
  if (sessionIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_messages")
    .select("interview_session_id, role, content")
    .in("interview_session_id", sessionIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch open data messages: ${error.message}`);
  }
  return data ?? [];
}

// 一覧では本文（content）を含めず、詳細でのみ含める。
// as const で template literal 型を保ち、Supabase の行型推論を効かせる
const openDataBillSelect = <C extends string>(contentColumns: C) =>
  `
  id,
  name,
  slug,
  department,
  contact,
  published_at,
  created_at,
  policy_contents!inner (${contentColumns}),
  policies_tags (tags (id, label))
` as const;

/**
 * 公開中の施策を難易度別コンテンツ・タグ付きで
 * 新しい順（created_at DESC, id DESC）に取得する。
 * 指定難易度のコンテンツが存在しない施策は含めない。
 */
export async function findOpenDataPublishedBills(params: {
  limit: number;
  cursor: OpenDataCursor | null;
  difficulty: DifficultyLevelEnum;
}) {
  const supabase = createAdminClient();
  let query = supabase
    .from("policies")
    .select(openDataBillSelect("title, summary"))
    .eq("publish_status", "published")
    .eq("policy_contents.difficulty_level", params.difficulty);

  if (params.cursor) {
    // カーソル値は decodeCursor で ISO タイムスタンプ・UUID 形式に
    // 検証済みのため、フィルタ文字列に安全に埋め込める
    const { createdAt, id } = params.cursor;
    query = query.or(
      `created_at.lt."${createdAt}",and(created_at.eq."${createdAt}",id.lt."${id}")`
    );
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(params.limit);

  if (error) {
    throw new Error(`Failed to fetch open data policies: ${error.message}`);
  }
  return data;
}

/**
 * 公開中の施策を1件、難易度別コンテンツ・タグ付きで取得する。
 * 非公開・存在しない・指定難易度のコンテンツがない場合は null。
 */
export async function findOpenDataPublishedBillById(params: {
  billId: string;
  difficulty: DifficultyLevelEnum;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies")
    .select(openDataBillSelect("title, summary, content"))
    .eq("id", params.billId)
    .eq("publish_status", "published")
    .eq("policy_contents.difficulty_level", params.difficulty)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch open data policy: ${error.message}`);
  }
  return data;
}

/**
 * レートリミットカウンタを加算し、制限内かを返す。
 */
export async function consumeRateLimit(params: {
  key: string;
  windowStart: string;
  limit: number;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("increment_api_rate_limit", {
    p_key: params.key,
    p_window_start: params.windowStart,
    p_limit: params.limit,
  });

  if (error) {
    throw new Error(`Failed to consume rate limit: ${error.message}`);
  }
  return data === true;
}
