/**
 * トップページのセクションID。
 *
 * ファーストビューの導線カードから、同一ページ内の対応セクションへ
 * スクロールさせるために使う。id とハッシュを1か所で持ち、ずれを防ぐ。
 */
export const TOP_SECTIONS = {
  interview: "ai-interview",
  policy: "policies",
} as const;
