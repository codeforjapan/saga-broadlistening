/**
 * ページレイアウトに関するユーティリティ
 *
 * TOPページと施策詳細ページは「メインページ」として扱い、
 * - DifficultySelectorを表示
 * - チャットサイドバー用のオフセットレイアウトを使用
 */

/** メインページ（TOP、施策詳細）かどうかを判定 */
export function isMainPage(pathname: string): boolean {
  // トップページ
  if (pathname === "/") return true;
  // 施策詳細ページ（/bills/[id]）- サブパスは除外
  if (/\/bills\/[^/]+$/.test(pathname)) return true;
  return false;
}

/** インタビューチャットページかどうかを判定 */
export function isInterviewPage(pathname: string): boolean {
  // /bills/[id]/interview/chat または /interviews/[slug]/chat
  return (
    /\/bills\/[^/]+\/interview\/chat$/.test(pathname) ||
    /^\/interviews\/[^/]+\/chat$/.test(pathname)
  );
}

/** インタビューセクション（LP・チャット含む）かどうかを判定 */
export function isInterviewSection(pathname: string): boolean {
  // /bills/[id]/interview 以下すべて、およびテーマ単独の /interviews/[slug] 以下すべて。
  // テーマ一覧ページ（/interviews）自体は通常のページなので含めない。
  return (
    /\/bills\/[^/]+\/interview(\/|$)/.test(pathname) ||
    /^\/interviews\/[^/]+(\/|$)/.test(pathname)
  );
}
