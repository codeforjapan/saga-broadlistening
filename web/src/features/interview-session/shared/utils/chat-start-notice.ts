/**
 * チャット冒頭の案内（#158、デザイン「4b」）。詳しい説明はきかせてページに任せ、3行以内に収める。
 * 「はじめる」を押した時点で、この内容と利用規約・プライバシーポリシーに同意したものとする。
 */

/** 案内1行分。テーマ名はリンク、強調は太字で出す */
export type ChatStartNoticeSegment =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "theme"; text: string };

export const MAX_CHAT_START_NOTICE_LINES = 3;

export function buildChatStartNotice(params: {
  themeName: string;
  estimatedDuration: number | null;
}): ChatStartNoticeSegment[][] {
  // 文中に入れるので、見出し用の formatEstimatedDuration（「約10分〜」）ではなく「約10分」にする
  const duration =
    params.estimatedDuration === null ? "" : `約${params.estimatedDuration}分`;
  return [
    [
      { kind: "text", text: "こんにちは。「" },
      { kind: "theme", text: params.themeName },
      {
        kind: "text",
        text: duration
          ? `」について、${duration}お話を伺います。`
          : "」について、お話を伺います。",
      },
    ],
    [
      { kind: "text", text: "いただいた回答は、整理したうえで" },
      { kind: "strong", text: "公開されることがあります" },
      {
        kind: "text",
        text: "。お名前や連絡先など、個人がわかる情報は書かないでください。",
      },
    ],
    [{ kind: "text", text: "準備ができたら「はじめる」を押してください。" }],
  ];
}
