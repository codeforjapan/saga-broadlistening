/**
 * 会話の1ターン目（利用者の最初の発言）かどうかを判定する。
 * chat_sessions を新規作成するか、既存セッションへ追記するかの分岐に使う。
 */
export function isFirstChatTurn(messages: { role: string }[]): boolean {
  return messages.filter((message) => message.role === "user").length <= 1;
}
