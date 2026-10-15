export type PolicyApproval = {
  approved_at: string | null;
  approved_by: string | null;
};

/**
 * 施策フォームの「レビュー完了（承認）」から、policies に書き込む承認の列を決める。
 * - 指定なし：変えない
 * - チェックあり：未承認なら現在日時と操作した管理者。承認済みなら元の日時・承認者を残す
 * - チェックなし：承認を取り消す
 */
export function resolvePolicyApproval(params: {
  isApproved: boolean | undefined;
  current: PolicyApproval | null;
  actorId: string | undefined;
  now: Date;
}): Partial<PolicyApproval> {
  const { isApproved, current, actorId, now } = params;
  if (isApproved === undefined) return {};
  if (!isApproved) return { approved_at: null, approved_by: null };
  if (current?.approved_at) return {};
  // 承認者の分からない承認を作らない
  if (!actorId) throw new Error("承認には操作した管理者が必要です");
  return { approved_at: now.toISOString(), approved_by: actorId };
}
