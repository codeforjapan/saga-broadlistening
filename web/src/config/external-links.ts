import { BRAND_CONFIG } from "@mirai-gikai/branding/config";

/**
 * 外部リンク定数
 *
 * TODO(#15): 佐賀市側のFAQ・サービス紹介ページのURLが確定したら
 * ここに定数を追加し、フッター等のリンクを復活させる。
 */
// 自治体ごとに変わるリンクは brand.config.ts で設定する
export const EXTERNAL_LINKS = {
  /** 不具合・問題の報告フォーム（TODO(#15): 佐賀市側フォームが用意でき次第差し替え） */
  REPORT: BRAND_CONFIG.links.report,
  GITHUB_REPO: BRAND_CONFIG.links.sourceRepository,
  FORK_GUIDELINES: BRAND_CONFIG.links.forkGuidelines,
} as const;
