import { BRAND_CONFIG } from "@mirai-gikai/branding/config";

/**
 * 外部リンク定数。自治体ごとに変わるリンクは brand.config.ts の links で設定する。
 *
 * TODO(#15): 佐賀市側のFAQ・サービス紹介ページのURLが確定したら
 * brand.config.ts の links に追加し、フッター等のリンクを復活させる。
 */
export const EXTERNAL_LINKS = {
  /** 不具合・問題の報告フォーム */
  REPORT: BRAND_CONFIG.links.report,
  GITHUB_REPO: BRAND_CONFIG.links.sourceRepository,
  FORK_GUIDELINES: BRAND_CONFIG.links.forkGuidelines,
} as const;
