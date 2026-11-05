"use client";

import dynamic from "next/dynamic";

/** 返答の表示に streamdown（shiki・mermaid）と katex を使い重いので、必要になるまで読み込まない（#231） */
export const LazyChatWindow = dynamic(
  () => import("./chat-window").then((mod) => mod.ChatWindow),
  { ssr: false }
);

/** 開く操作の直前（ポインターが乗った・フォーカスした）に読み込みを始めておく */
export function preloadChatWindow() {
  void import("./chat-window");
}
