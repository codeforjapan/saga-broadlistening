import type { Viewport } from "next";

/**
 * インタビューのチャットページ用の viewport。
 *
 * Android Chrome は既定（resizes-visual）ではキーボードを開いても dvh が縮まず、
 * ページごと上にずれて最新の応答が見切れる。resizes-content にして、
 * キーボードの分だけチャット画面（h-dvh）を縮める。
 * 指定しない項目はルートレイアウトの viewport を引き継ぐ。
 */
export const interviewChatViewport: Viewport = {
  interactiveWidget: "resizes-content",
};
