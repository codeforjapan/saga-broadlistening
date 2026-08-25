import { normalizeRoleTitle } from "./normalize-role-title";
import type { PublicRespondent, RawRespondentRow } from "./public-types";

/**
 * 公開意見の生行から、回答一覧カード用の表示データを構築する純粋関数。
 * role_title を表示用に正規化する。フィルタは取得側で適用済み。
 */
export function buildPublicBillRespondents(
  rows: RawRespondentRow[]
): PublicRespondent[] {
  return rows.map((r) => ({
    id: r.id,
    role_title: normalizeRoleTitle(r.role_title),
    summary: r.summary,
    final_text: r.final_text,
    created_at: r.created_at,
  }));
}
