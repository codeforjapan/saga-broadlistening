type UiMessageLike = {
  parts?: Array<{ type: string; text?: string }>;
};

/**
 * UIMessage のテキストパートを連結して本文を取り出す。
 * chat_messages への保存に使う。
 */
export function extractUiMessageText(
  message: UiMessageLike | undefined
): string {
  if (!message?.parts) return "";
  return message.parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}
