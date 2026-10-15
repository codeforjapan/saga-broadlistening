import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * インタビューのチャットの白い面（デザイン「4b」）。
 * 中央の列いっぱいに、上の2つの角だけを丸めて画面の下まで続ける。
 * 地の薄い緑は MainLayout がページ全体に敷く。
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
          "flex h-full flex-col bg-white pt-23 md:rounded-t-[36px] md:pt-10",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
