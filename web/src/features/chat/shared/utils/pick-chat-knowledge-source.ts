/**
 * チャットの system prompt に渡すナレッジソース文字列を決める。
 * AI質問機能が OFF / 未設定なら空文字を返してプロンプト側で省略させる。
 *
 * Epic #54 で policies.use_knowledge_source_in_chat は enable_ai_chat に置き換わった。
 */
export function pickChatKnowledgeSource(
  bill:
    | {
        knowledge_source?: string | null;
        enable_ai_chat?: boolean | null;
      }
    | null
    | undefined
): string {
  if (!bill?.enable_ai_chat) return "";
  return bill.knowledge_source ?? "";
}
