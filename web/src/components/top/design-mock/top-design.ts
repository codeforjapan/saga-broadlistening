/**
 * TOPページのデザイン比較モック（案A〜案D）の出し分け。
 *
 * `/?design=a` 〜 `/?design=d` で、それぞれ案A〜案D を表示する。
 * パラメータなし・不正値は現行TOPのまま。
 */
export const TOP_DESIGNS = ["a", "b", "c", "d"] as const;

export type TopDesign = (typeof TOP_DESIGNS)[number];

/** クエリパラメータ `design` の値を案の識別子に変換する。該当しなければ null */
export function parseTopDesign(
  value: string | string[] | undefined
): TopDesign | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.toLowerCase();
  return TOP_DESIGNS.find((design) => design === normalized) ?? null;
}
