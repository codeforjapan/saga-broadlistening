import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

/**
 * opinions を id で 1 件取得する。
 * 既存の interview-report-repository は session_id ベースなので、
 * シミュレーション機能用に意見 ID 直接アクセスを提供する。
 */
export async function findInterviewReportById(reportId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("opinions")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch interview report: ${error.message}`);
  }

  return data;
}
