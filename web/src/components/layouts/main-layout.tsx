"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  getPageLayout,
  isInterviewPage,
  isInterviewSection,
} from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { showHeader, chatSidebar, fullBleed } = getPageLayout(pathname);
  const isInterview = isInterviewSection(pathname);
  // インタビューのチャット（デザイン「4b」）は、ヘッダーの後ろも含めて画面全体を薄い緑にする。
  // スマホ幅では白い面が画面幅いっぱいなので、緑は見えない（チャット中と同じ）
  const isInterviewChat = isInterviewPage(pathname);

  return (
    <div
      className={cn(
        // モバイルは余白なし（ヒーロー/サムネイルを画面最上部に表示）、md以上で固定
        // ヘッダー分の上余白を確保する。パンくずを持つページは各ページ側で
        // モバイル時の上余白（pt-24 md:pt-0）を付与してヘッダー埋もれを回避する。
        "relative mx-auto",
        showHeader && "md:mt-24",
        !fullBleed && "max-w-[700px]",
        // 本文の地（main の薄青グレー）を外し、下に敷いた緑を見せる
        isInterviewChat && "[&>main]:bg-transparent",
        // インタビューページと全幅のページ以外ではshadowを表示
        !isInterview && !fullBleed && "sm:shadow-lg",
        // 施策詳細ページのみ。本文の地は白にし（薄青グレーを外す）、チャットサイドバー用のオフセットをとる。
        // チャットパネル(CHAT_PANEL_RESPONSIVE_CLASSES: 420px)+右マージン・ガターぶんの
        // 470pxを右に確保しつつ、メインパネルを850pxへ拡大（850+470=1320で中央寄せ計算と一致）。
        // 1320px より広い pcl（1400px）から中央に寄せる
        chatSidebar &&
          "[&>main]:bg-background pc:max-w-[850px] pc:mr-[470px] pcl:ml-[calc(calc(100vw-1320px)/2)]"
      )}
    >
      {isInterviewChat && (
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 bg-kikasete-50"
        />
      )}
      {children}
    </div>
  );
}
