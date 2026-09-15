/** OpenAI専用の検索ツールを送れる接続経路かを判定する。 */
export function supportsWebSearch(modelId: string): boolean {
  return modelId.startsWith("openai:") || modelId.startsWith("gateway:openai/");
}
