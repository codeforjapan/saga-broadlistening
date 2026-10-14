"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { getPageLayout, isInterviewSection } from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { chatSidebar, fullBleed } = getPageLayout(pathname);
  const isInterview = isInterviewSection(pathname);

  return (
    <div
      className={cn(
        // モバイルは余白なし（ヒーロー/サムネイルを画面最上部に表示）、md以上で固定
        // ヘッダー分の上余白を確保する。パンくずを持つページは各ページ側で
        // モバイル時の上余白（pt-24 md:pt-0）を付与してヘッダー埋もれを回避する。
        "relative mx-auto md:mt-24",
        !fullBleed && "max-w-[700px]",
        // インタビューページと全幅のページ以外ではshadowを表示
        !isInterview && !fullBleed && "sm:shadow-lg",
        // 施策詳細ページのみ、チャットサイドバー用のオフセット
        // チャットパネル(CHAT_PANEL_PC_WIDTH_CLASS: 300px)+右マージン・ガターぶんの
        // 350pxを右に確保しつつ、メインパネルを850pxへ拡大（850+350=1180で中央寄せ計算と一致）
        chatSidebar &&
          "pc:max-w-[850px] pc:mr-[350px] xl:ml-[calc(calc(100vw-1180px)/2)]"
      )}
    >
      {children}
    </div>
  );
}
