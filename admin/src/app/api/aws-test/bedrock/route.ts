import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getAwsCredentials } from "@/lib/aws-credentials";
import { env } from "@/lib/env";

export const maxDuration = 30;

// 疎通確認用の固定モデル。BedrockStack(prd)の既定モデルに合わせている。
// 注意: リージョンのオンデマンドスループット設定によっては、生のmodel IDではなく
// クロスリージョン推論プロファイルID（例: apac.anthropic.claude-3-5-sonnet-...）が
// 必要な場合がある。実機で初めて確認すること（ValidationExceptionが出たら要見直し）。
const TEST_MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0";

/**
 * Vercel OIDC Federation経由でBedrockのbedrock:InvokeModel権限が機能しているかを
 * 確認するための疎通確認エンドポイント（Vercel OIDCロールの権限テスト・呼び出し方の
 * サンプルを兼ねる）。実際のアプリケーションロジックでの利用先は未定。
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
            content: [{ text: "疎通確認です。「OK」とだけ返してください。" }],
          },
        ],
      })
    );

    const text = result.output?.message?.content?.[0]?.text ?? "";
    return Response.json({ ok: true, modelId: TEST_MODEL_ID, text });
  } catch (error) {
    console.error("[aws-test/bedrock] failed:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
