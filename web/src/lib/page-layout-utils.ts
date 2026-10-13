/**
 * ページレイアウトに関するユーティリティ
 */

/** ページごとのレイアウト設定 */
export type PageLayout = {
  /** ヘッダーに難易度切り替え（説明をもっと詳しく）を出す */
  showDifficultySelector: boolean;
  /** スマホ幅では難易度切り替えをヘッダーからメニュー内へ移す */
  difficultyInMobileMenu: boolean;
  /** チャットサイドバー用のオフセットレイアウト（右に常設チャット）を使う */
  chatSidebar: boolean;
  /** 帯状の背景を画面幅いっぱいに敷く（幅の上限と影を外す） */
  fullBleed: boolean;
};

const DEFAULT_LAYOUT: PageLayout = {
  showDifficultySelector: false,
  difficultyInMobileMenu: false,
  chatSidebar: false,
  fullBleed: false,
};

/**
 * パスからページのレイアウト設定を決める。
 *
 * - TOP（Epic #162 のテーマカード型）: 全幅。チャットは置かない。スマホでは難易度切り替えをメニューへ
 * - 施策詳細（/bills/[id]、サブパスは除く）: 右に常設チャットを置くオフセットレイアウト
 */
export function getPageLayout(pathname: string): PageLayout {
  if (pathname === "/") {
    return {
      ...DEFAULT_LAYOUT,
      showDifficultySelector: true,
      difficultyInMobileMenu: true,
      fullBleed: true,
    };
  }
  if (/\/bills\/[^/]+$/.test(pathname)) {
    return {
      ...DEFAULT_LAYOUT,
      showDifficultySelector: true,
      chatSidebar: true,
    };
  }
  return DEFAULT_LAYOUT;
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
