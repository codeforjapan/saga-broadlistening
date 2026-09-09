import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getAwsCredentials } from "@/lib/aws-credentials";
import { env } from "@/lib/env";
import { requireSecretHeader } from "@/lib/require-secret-header";

export const maxDuration = 30;

// 疎通確認用の固定モデル。/api/tests/aws/bedrock と同じもの（Issue #45参照）。
const TEST_MODEL_ID = "jp.anthropic.claude-sonnet-4-6";

/**
 * /api/tests/aws/bedrock（固定文言での疎通確認のみ）とは別に、任意のメッセージを
 * 送ってLLMらしい応答が返ってくるかを確認するためのエンドポイント。
 * `X-Api-Test-Secret-Token` ヘッダーによる共有シークレット認証（管理者ログイン不要）。
 * クエリパラメータ `message` は必須。
 */
export async function GET(request: Request) {
  try {
    requireSecretHeader(request);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const message = searchParams.get("message");
  if (!message) {
    return Response.json(
      { error: "クエリパラメータ message は必須です" },
      { status: 400 }
    );
  }

  try {
    const client = new BedrockRuntimeClient({
      region: env.aws.region,
      credentials: getAwsCredentials(),
    });

    const result = await client.send(
      new ConverseCommand({
        modelId: TEST_MODEL_ID,
        messages: [{ role: "user", content: [{ text: message }] }],
      })
    );

    const text = result.output?.message?.content?.[0]?.text ?? "";
    return Response.json({ ok: true, modelId: TEST_MODEL_ID, text });
  } catch (error) {
    console.error("[tests/aws/bedrock/chat] failed:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
