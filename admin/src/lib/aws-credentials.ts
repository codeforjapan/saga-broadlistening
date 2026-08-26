import "server-only";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { env } from "@/lib/env";

/**
 * AWS SDKクライアント用の資格情報プロバイダーを返す。
 * `AWS_ROLE_ARN` が設定されていれば Vercel OIDC Federation 経由（本番/プレビュー）、
 * 未設定ならローカル開発とみなし `~/.aws` の資格情報チェーンにフォールバックする
 * （Vercel OIDCはローカルでは使えないため）。
 *
 * Vercelにデプロイされている（`VERCEL_ENV`が設定されている）のに`AWS_ROLE_ARN`が
 * 無い場合は、設定ミスの可能性が高いため`fromNodeProviderChain()`に静かにフォール
 * バックせず即座にエラーにする。ambient環境変数（AWS_ACCESS_KEY_ID等が別の理由で
 * 残っていた場合など）で意図しない資格情報が使われてしまうのを防ぐため。
 */
export function getAwsCredentials() {
  if (env.aws.roleArn) {
    return awsCredentialsProvider({
      roleArn: env.aws.roleArn,
      audience: "sts.amazonaws.com",
    });
  }
  if (process.env.VERCEL_ENV) {
    throw new Error(
      "AWS_ROLE_ARN が設定されていません（Vercelにデプロイされた環境では必須です）"
    );
  }
  return fromNodeProviderChain();
}
