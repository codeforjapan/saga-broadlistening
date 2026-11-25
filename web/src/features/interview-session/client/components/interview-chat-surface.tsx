import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * インタビューのチャットの白いカード（#271）。
 * 中央の列（PC は幅700px）いっぱいに、上の2つの角だけを丸めて画面の下まで続ける。
 * 配下はきかせてのテーマ（緑・Noto Sans JP の見出し）になる。
 * 地のグラデーションは MainLayout がページ全体に敷く。
 *
 * 高さは h-dvh。Android でキーボードの分だけ縮めるため、この面を使うページは
 * `interviewChatViewport` を viewport として export すること。
 */
export function InterviewChatSurface({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  /** 開始画面の目印（data-interview-chat-start）など */
  [dataAttribute: `data-${string}`]: string | undefined;
}) {
  return (
    <div className="h-dvh md:h-[calc(100dvh-96px)]" {...props}>
      <div
        className={cn(
          "theme-interview flex h-full flex-col bg-white px-4 pt-23 md:rounded-t-[32px] md:px-12 md:pt-10 md:shadow-card",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
