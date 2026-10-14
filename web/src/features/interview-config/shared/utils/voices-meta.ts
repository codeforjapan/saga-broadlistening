import { formatDateWithDots } from "@/lib/utils/date";

/**
 * きかせてページ「これまでの声」の見出し横の表記（例: 「86件のご意見 · 2026.10.8 更新」）。
 * 更新日が分からなければ件数だけを出す。
 */
export function formatVoicesMeta(params: {
  opinionCount: number;
  updatedAt: string | null;
}): string {
  const count = `${params.opinionCount.toLocaleString("ja-JP")}件のご意見`;
  const date = params.updatedAt ? formatDateWithDots(params.updatedAt) : "";
  return date ? `${count} · ${date} 更新` : count;
}
