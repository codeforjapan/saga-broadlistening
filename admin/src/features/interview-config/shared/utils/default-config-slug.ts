/**
 * 新規作成時に Slug 欄へ入れておく初期値を生成する。
 * 職員はそのまま保存しても、書き換えてから保存してもよい。
 *
 * Slug は公開ページの URL（/interviews/[slug]）に使うため英小文字・数字・ハイフンだけにする。
 * 日付は Asia/Tokyo タイムゾーンで YYYYMMDD 形式。同じ日に作った設定どうしが
 * 重複しないよう、末尾にランダムな英数字を付ける。
 */
export function generateDefaultConfigSlug(
  now: Date = new Date(),
  suffix: string = crypto.randomUUID().slice(0, 6)
): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  })
    .format(now)
    .replaceAll("-", "");
  return `interview-${date}-${suffix}`;
}
