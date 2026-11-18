"use client";

import { useEffect, useState } from "react";

/**
 * トピック一覧・意見一覧・回答一覧で共通の「段階表示」状態を管理するフック。
 *
 * - persistKey を渡すと表示件数を sessionStorage に保存し、別ページから戻った際に
 *   復元する（トピック詳細→一覧の「戻る」でページネーション位置を維持する用途）。
 *
 * Epic #54 で回答者カテゴリ・賛否が廃止され、フィルタ軸が無くなったため
 * 絞り込みの責務は持たない（ファイル名の改名は Epic #8 完了後のフォローアップ）。
 */
export function useFilteredPagination<T>(
  items: T[],
  initialVisible: number,
  loadStep: number,
  persistKey?: string
) {
  const [visibleCount, setVisibleCount] = useState(initialVisible);

  // 戻り遷移時にページネーション位置を復元する。
  // ハイドレーション不整合を避けるため初期値はそのままにし、
  // マウント後の effect で sessionStorage の値を反映する。
  useEffect(() => {
    if (!persistKey) return;
    const stored = sessionStorage.getItem(persistKey);
    const n = stored ? Number.parseInt(stored, 10) : Number.NaN;
    if (Number.isFinite(n) && n > initialVisible) {
      setVisibleCount(n);
    }
  }, [persistKey, initialVisible]);

  const loadMore = () => {
    setVisibleCount((count) => {
      const next = count + loadStep;
      if (persistKey) sessionStorage.setItem(persistKey, String(next));
      return next;
    });
  };

  const visible = items.slice(0, visibleCount);
  const remaining = items.length - visible.length;

  return { visible, remaining, loadMore };
}
