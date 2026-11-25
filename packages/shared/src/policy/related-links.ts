import { z } from "zod";
import { isHttpUrl } from "../url/is-http-url";

/**
 * 施策紹介ページの関連リンク（policies.related_links）。
 *
 * DB には kind を英語のキーで保存し、画面に出すラベルはここで対応づける。
 * 配列の順がそのまま表示順。admin の保存時と web の読み出し時の両方でこのスキーマを使う。
 */

export const RELATED_LINK_KINDS = ["policy_detail", "city_hp"] as const;

export type RelatedLinkKind = (typeof RELATED_LINK_KINDS)[number];

export const RELATED_LINK_KIND_LABELS: Record<RelatedLinkKind, string> = {
  policy_detail: "施策詳細ページ",
  city_hp: "佐賀市HP",
};

export const MAX_RELATED_LINKS = 10;

const httpUrlSchema = z
  .string()
  .trim()
  .min(1, "URLは必須です")
  .max(2000, "URLは2000文字以内で入力してください")
  .refine(isHttpUrl, "http:// または https:// で始まるURLを入力してください");

export const relatedLinkSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "表示名は必須です")
    .max(200, "表示名は200文字以内で入力してください"),
  url: httpUrlSchema,
  kind: z.enum(RELATED_LINK_KINDS, { message: "種別を選択してください" }),
});

export type RelatedLink = z.infer<typeof relatedLinkSchema>;

export const relatedLinksSchema = z
  .array(relatedLinkSchema)
  .max(MAX_RELATED_LINKS, `関連リンクは${MAX_RELATED_LINKS}件までです`);

/**
 * DB から読んだ related_links（jsonb）を表示用に取り出す。
 * 形の合わない要素は捨て、残りを元の順で返す。
 */
export function parseRelatedLinks(value: unknown): RelatedLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const result = relatedLinkSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}
