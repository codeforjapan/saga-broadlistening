import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";

/**
 * 指定の意見募集が施策に紐づいているかを検証する。
 * Epic #54 で施策 ↔ 意見募集は policies_interview_configs による多対多に
 * なったため、中間テーブルの存在チェックで判定する。
 * ファイル名・関数名の bill → policy 改名は Epic #8 完了後に行う。
 */
export async function verifyConfigBelongsToBill(
  configId: string,
  billId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("policies_interview_configs")
    .select("interview_config_id")
    .eq("interview_config_id", configId)
    .eq("policy_id", billId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("指定されたインタビュー設定はこの施策に属していません");
  }
}
