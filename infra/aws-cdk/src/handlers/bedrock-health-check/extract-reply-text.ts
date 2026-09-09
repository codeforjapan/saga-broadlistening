import type { ContentBlock } from "@aws-sdk/client-bedrock-runtime";

/**
 * ConverseCommandのレスポンスに含まれるcontentブロックからテキストを取り出す。
 * text以外のブロック種別（画像・ツール利用等）の場合はundefinedを返す。
 */
export function extractReplyText(
  content: ContentBlock | undefined
): string | undefined {
  return content && "text" in content ? content.text : undefined;
}
