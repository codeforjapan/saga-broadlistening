import { MIN_PUBLIC_OPINIONS_FOR_DISPLAY } from "../report-publication/auto-publish";

/**
 * みんなの声のまとめを生成・公開できる最低件数（テーマごとの公開済み意見の数）。
 * 少ない件数でまとめを出すと内容を盛っているように見えるため、既存の表示ゲート
 * （公開意見を一覧に出す最低件数）にそろえる（2026-10-13 決定）。
 */
export const MIN_OPINIONS_FOR_VOICE_SUMMARY = MIN_PUBLIC_OPINIONS_FOR_DISPLAY; // 20

export function canGenerateVoiceSummary(publicOpinionCount: number): boolean {
  return publicOpinionCount >= MIN_OPINIONS_FOR_VOICE_SUMMARY;
}
