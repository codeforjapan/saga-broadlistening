"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  EXTERNAL_IDENTITY_CAPTURE_PATH,
  PENDING_UID_FRAGMENT_STORAGE_KEY,
  PENDING_UID_FRAGMENT_WINDOW_KEY,
} from "../../shared/constants";
import { parseUidFragment } from "../../shared/utils/uid-fragment";

declare global {
  interface Window {
    /** インラインスクリプトが退避した UID 付きフラグメント */
    [PENDING_UID_FRAGMENT_WINDOW_KEY]?: string;
  }
}

/**
 * 外部アプリが `#uid=...` 付きで開いたとき、UID をサーバーへ送って Cookie に移す。
 *
 * root layout のインラインスクリプト（early-capture-script）が最初の JS 実行時点で
 * フラグメントを window に退避し URL から除去しているので、ここではそれを読んで
 * 検証し、Route Handler へ送る。送信に失敗したときは sessionStorage に残し、
 * 次のページ遷移で再送する（URL からは既に消えているため、ここで捨てると二度と届かない）。
 * Cookie が新しく付いたときだけ router.refresh() で Server Components を再描画し、
 * 開き直さなくても紐付け後の表示に切り替わるようにする。
 */
export function ExternalUidCapture() {
  const router = useRouter();
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname はページ遷移ごとに再送を試みるための依存
  useEffect(() => {
    const hash = takePendingHash();
    if (!hash) return;
    const claim = parseUidFragment(hash);
    if (!claim) return;

    fetch(EXTERNAL_IDENTITY_CAPTURE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(claim),
    })
      .then(async (response) => {
        if (!response.ok) {
          // 4xx は形式不正なので再送しない。5xx は次の遷移で再送する
          if (response.status >= 500) keepPendingHash(hash);
          return;
        }
        const data: unknown = await response.json();
        const changed =
          typeof data === "object" &&
          data !== null &&
          (data as { changed?: unknown }).changed === true;
        if (changed) router.refresh();
      })
      .catch((error) => {
        console.error("Failed to capture external uid:", error);
        keepPendingHash(hash);
      });
  }, [router, pathname]);

  return null;
}

/**
 * 退避済みのフラグメントを取り出し、二重送信しないよう消す。
 * インラインスクリプトが置いた window の値を優先し、無ければ前回送信に失敗した分を読む。
 */
function takePendingHash(): string | null {
  const pending = window[PENDING_UID_FRAGMENT_WINDOW_KEY];
  delete window[PENDING_UID_FRAGMENT_WINDOW_KEY];
  if (pending) return pending;

  try {
    const retry = window.sessionStorage.getItem(
      PENDING_UID_FRAGMENT_STORAGE_KEY
    );
    window.sessionStorage.removeItem(PENDING_UID_FRAGMENT_STORAGE_KEY);
    return retry;
  } catch {
    return null;
  }
}

/** 送信に失敗したフラグメントを次の遷移まで残す */
function keepPendingHash(hash: string): void {
  try {
    window.sessionStorage.setItem(PENDING_UID_FRAGMENT_STORAGE_KEY, hash);
  } catch {
    // 保存できない環境では諦める（UID は既に URL から除去済み）
  }
}
