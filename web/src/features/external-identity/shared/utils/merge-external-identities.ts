/**
 * Cookie 由来の外部IDを先頭に、既存の紐付け（渡された順＝新しい順）を後ろに並べ、
 * 同じ外部IDは1件にまとめる。先頭が回答（セッション）に記録する外部IDになる。
 */
export function mergeExternalIdentities<T extends { id: string }>(
  fromCookies: readonly T[],
  linked: readonly T[]
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const identity of [...fromCookies, ...linked]) {
    if (seen.has(identity.id)) continue;
    seen.add(identity.id);
    merged.push(identity);
  }
  return merged;
}
