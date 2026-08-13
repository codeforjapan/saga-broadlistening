import type { ConverseCommandInput } from "@aws-sdk/client-bedrock-runtime";

export interface GuardrailOptions {
  readonly guardrailId: string;
  readonly guardrailVersion: string;
}

/**
 * guardrailIdとguardrailVersionからGuardrailOptionsを組み立てる。
 * 呼び出し元（CDK側）は常に両方を同時に設定するため、片方だけ設定されている状態は
 * 設定ミス以外あり得ず、エラーとして扱う。
 */
export function resolveGuardrailOptions(
  guardrailId: string | undefined,
  guardrailVersion: string | undefined
): GuardrailOptions | undefined {
  if (Boolean(guardrailId) !== Boolean(guardrailVersion)) {
    throw new Error(
      "guardrailId and guardrailVersion must both be set or both be unset " +
        `(guardrailId: ${guardrailId ? "set" : "unset"}, guardrailVersion: ${
          guardrailVersion ? "set" : "unset"
        })`
    );
  }
  return guardrailId && guardrailVersion
    ? { guardrailId, guardrailVersion }
    : undefined;
}

/**
 * Bedrock疎通確認用に、モデルへ最小限のメッセージを送るConverseCommand入力を組み立てる。
 * guardrailを指定した場合、有害コンテンツ検知・ブロックを行うGuardrailを適用する。
 */
export function buildHealthCheckConverseInput(
  modelId: string,
  guardrail?: GuardrailOptions
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
    ...(guardrail && {
      guardrailConfig: {
        guardrailIdentifier: guardrail.guardrailId,
        guardrailVersion: guardrail.guardrailVersion,
      },
    }),
  };
}
