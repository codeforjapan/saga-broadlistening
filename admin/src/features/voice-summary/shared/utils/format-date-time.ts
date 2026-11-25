const dateTime = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

/** 管理画面の日時表示（日本時間）。値がなければ「—」 */
export function formatDateTime(value: string | null): string {
  return value ? dateTime.format(new Date(value)) : "—";
}
