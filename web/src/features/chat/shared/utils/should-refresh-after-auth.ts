/**
 * 匿名認証が確立したあと、Server Components を再描画（router.refresh）すべきか。
 * サーバーが描画した時点の利用者と同じなら、参加条件や回答導線はすでに正しいので再描画しない（#230）。
 * 初回訪問（サーバー側に利用者がいない）や、セッションが入れ替わった場合だけ再描画する。
 */
export function shouldRefreshAfterAuth(
  serverUserId: string | null,
  clientUserId: string | undefined
): boolean {
  return clientUserId !== undefined && clientUserId !== serverUserId;
}
