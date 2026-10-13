import "server-only";

import type { ReactNode } from "react";
import { KikaseteBox } from "@/features/interview-config/client/components/kikasete-box";
import type { KikaseteBoxData } from "@/features/interview-config/server/loaders/get-kikasete-box";

interface VoicesPageFrameProps {
  /** ページ下部のきかせてボックス。募集中でなければ null（出さない） */
  kikasete: KikaseteBoxData | null;
  children: ReactNode;
}

/**
 * みんなの声のページ（トピック一覧・トピック詳細・インタビューレポート・まとめ）の共通の枠（#159）。
 * 中央1カラム（幅720px）にし、アクセントをきかせての緑にする（.theme-kikasete）。
 * 背景は水色をやめ、白いカードが浮いて見える薄いグレー（muted）にする。
 * ページ下部の参加導線は、TOP・親施策ページと同じきかせてボックス。
 */
export function VoicesPageFrame({ kikasete, children }: VoicesPageFrameProps) {
  return (
    <div className="theme-kikasete min-h-dvh bg-muted pt-24 md:pt-0">
      <div className="mx-auto flex max-w-[720px] flex-col gap-8 px-4 pb-8 md:pt-8">
        {children}
        {kikasete && <KikaseteBox {...kikasete} />}
      </div>
    </div>
  );
}
