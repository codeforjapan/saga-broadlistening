/**
 * 発話の一覧の末尾に、いま保存した発話を足す。
 * 一覧の取得と保存を並べて走らせるため、一覧に保存した発話が含まれる場合と
 * 含まれない場合の両方がある。id で重複を除いてから末尾に置く。
 */
export function appendSavedMessage<T extends { id: string }>(
  messages: T[],
  saved: T | null
): T[] {
  if (!saved) return messages;
  return [...messages.filter((message) => message.id !== saved.id), saved];
}
