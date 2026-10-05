"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isInterviewSection, isMainPage } from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const useSidebarLayout = isMainPage(pathname);
  const isInterview = isInterviewSection(pathname);

  return (
    <div
      className={cn(
        // モバイルは余白なし（ヒーロー/サムネイルを画面最上部に表示）、md以上で固定
        // ヘッダー分の上余白を確保する。パンくずを持つページは各ページ側で
        // モバイル時の上余白（pt-24 md:pt-0）を付与してヘッダー埋もれを回避する。
        "relative max-w-[700px] mx-auto md:mt-24",
        // インタビューページ以外ではshadowを表示
        !isInterview && "sm:shadow-lg",
        // TOPページと施策詳細ページのみ、チャットサイドバー用のオフセット
        // チャットパネル(CHAT_PANEL_PC_WIDTH_CLASS: 300px)+右マージン・ガターぶんの
        // 350pxを右に確保しつつ、メインパネルを850pxへ拡大（850+350=1180で中央寄せ計算と一致）
        useSidebarLayout &&
          "pc:max-w-[850px] pc:mr-[350px] xl:ml-[calc(calc(100vw-1180px)/2)]",
        // TOPデザイン比較モックの案B・C（/?design=b, /?design=c）は右ペインを持たず、
        // 帯状の背景を画面幅いっぱいに敷くため、幅の上限・影・チャット用オフセットを外す。
        // 目印（data-top-full-bleed）はページ側が出すので :has() で拾う。
        "has-[[data-top-full-bleed]]:max-w-none has-[[data-top-full-bleed]]:shadow-none has-[[data-top-full-bleed]]:mx-0"
      )}
    >
      {children}
    </div>
  );
}
