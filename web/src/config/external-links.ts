/**
 * 外部リンク定数
 *
 * TODO(#15): 運営自治体側のFAQ・サービス紹介ページのURLが確定したら
 * ここに定数を追加し、フッター等のリンクを復活させる。
 */
/** AGPL-3.0 に基づくソースコードの提示先 */
const REPO_URL = "https://github.com/codeforjapan/saga-broadlistening";

export const EXTERNAL_LINKS = {
  GITHUB_REPO: REPO_URL,
  /**
   * 不具合・問題の報告先。
   * TODO(#15): 導入自治体側のフォームが用意でき次第差し替える。
   * 特定案件のフォームに報告が流れ込まないよう、既定はGitHub Issuesに向けている。
   */
  REPORT: `${REPO_URL}/issues/new`,
  FORK_GUIDELINES: `${REPO_URL}/blob/develop/FORK_GUIDELINES.md`,
} as const;
