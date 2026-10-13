/**
 * AI設定生成で題材にする施策を決める。
 *
 * 施策配下の画面から開いたときはその施策を使う。新規作成画面など施策配下でないときは、
 * フォームで紐づけ中の先頭の施策を使う（インタビュー本番も紐づく施策を主たる題材にするため）。
 * どちらもなければ施策なし（テーマを題材にする）。
 */
export function resolveSubjectPolicyId(
  billId: string | null,
  policyIds: string[] | undefined
): string | null {
  return billId ?? policyIds?.[0] ?? null;
}
