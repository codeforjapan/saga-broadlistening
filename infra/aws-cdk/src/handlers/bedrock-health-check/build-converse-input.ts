import type { ConverseCommandInput } from "@aws-sdk/client-bedrock-runtime";

/**
 * Bedrock疎通確認用に、モデルへ最小限のメッセージを送るConverseCommand入力を組み立てる。
 */
export function buildHealthCheckConverseInput(
  modelId: string
): ConverseCommandInput {
  return {
    modelId,
    messages: [
      {
        role: "user",
        content: [
          { text: "Bedrock接続確認: 'ok'とだけ答えてください。" },
        ],
      },
    ],
  };
}
