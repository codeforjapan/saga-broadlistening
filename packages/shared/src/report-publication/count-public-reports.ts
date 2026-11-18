import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

/**
 * 意見募集（テーマ）の公開意見件数を数える（公開 = review_status = 'published'）。
 * k-匿名性しきい値（[[shouldDisplayPublicReports]]）の判定や公開ページの表示制御に使う共通関数。
 *
 * web の公開ページ・OG画像・リアクション、admin MCP の回答詳細ゲートが同一定義を共有する。
 */
export async function countPublicOpinionsByInterviewConfigId(
  interviewConfigId: string
): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("opinions")
    .select("id, interview_sessions!inner(interview_config_id)", {
      count: "exact",
      head: true,
    })
    .eq("review_status", "published")
    .eq("interview_sessions.interview_config_id", interviewConfigId);

  if (error) {
    throw new Error(`Failed to count public opinions: ${error.message}`);
  }

  return count ?? 0;
}
