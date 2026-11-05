/**
 * セッションの所有者かどうかをチェックする（既に取得したuser_idと比較）。
 *
 * Epic #54 で interview_sessions.user_id は nullable になった。
 * 所有者が記録されていないセッション（イベント経由）は誰のものでもない。
 */
export function isSessionOwner(
  sessionUserId: string | null,
  currentUserId: string
): boolean {
  return sessionUserId !== null && sessionUserId === currentUserId;
}
