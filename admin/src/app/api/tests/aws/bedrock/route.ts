import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getAwsCredentials } from "@/lib/aws-credentials";
import { env } from "@/lib/env";
import { requireSecretHeader } from "@/lib/require-secret-header";

export const maxDuration = 30;

// 疎通確認用の固定モデル。ap-northeast-1では生のmodel IDでのオンデマンド呼び出しが
// できず、クロスリージョン推論プロファイルIDが必要だったため、実機確認の上これに固定した。
// 日本CRIS（jp.）を使うのは、IAMポリシーを jp.* に限定する計画（Issue #45）と
// 整合させるため。
const TEST_MODEL_ID = "jp.anthropic.claude-sonnet-4-6";

const DEFAULT_MESSAGE = "疎通確認です。「OK」とだけ返してください。";

/**
 * Vercel OIDC Federation経由でBedrockのbedrock:InvokeModel権限が機能しているかを
 * 確認するための疎通確認エンドポイント（Vercel OIDCロールの権限テスト・呼び出し方の
 * サンプルを兼ねる）。実際のアプリケーションロジックでの利用先は未定。
 * `X-Api-Test-Secret-Token` ヘッダーによる共有シークレット認証（管理者ログイン不要）。
 * クエリパラメータ `message` で任意のメッセージを送信できる（省略時は固定の疎通確認文）。
 */
export async function GET(request: Request) {
  try {
    requireSecretHeader(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const message = searchParams.get("message") || DEFAULT_MESSAGE;

  try {
    const client = new BedrockRuntimeClient({
      region: env.aws.region,
      credentials: getAwsCredentials(),
    });

    const result = await client.send(
      new ConverseCommand({
        modelId: TEST_MODEL_ID,
        messages: [
          {
            role: "user",
            content: [{ text: message }],
          },
        ],
      })
    );

    const text = result.output?.message?.content?.[0]?.text ?? "";
    return Response.json({ ok: true, modelId: TEST_MODEL_ID, text });
  } catch (error) {
    console.error("[tests/aws/bedrock] failed:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
