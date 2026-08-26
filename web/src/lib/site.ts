/**
 * サービス全体で共有する識別情報
 *
 * NOTE: 同じ文言が `app/layout.tsx` の siteTitle/siteName、`components/top/about.tsx`、
 * `public/manifest.json` にも残っている。サービス名が「（仮）」で確定していないため
 * リネームは必ず来る想定で、参照はここに寄せていきたい。
 */

/** サービス名。ロゴのalt・aria-label・見出しで共通に使う */
export const SERVICE_NAME = "佐賀市公聴システム（仮）";
