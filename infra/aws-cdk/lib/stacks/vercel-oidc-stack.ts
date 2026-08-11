import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { EnvConfig } from "../config/types";

export interface VercelOidcStackProps extends cdk.StackProps {
  readonly envConfig: EnvConfig;
  readonly bedrockInvokeModelPolicy: iam.IManagedPolicy;
}

const VERCEL_TEAM_SLUG = "c4j";
const VERCEL_PROJECT_NAMES = ["web", "admin"];

/**
 * Vercel (web/admin) からBedrockをOIDC Federationで呼び出すためのIAMロールを管理するスタック。
 * Vercelが発行するOIDCトークンをsts:AssumeRoleWithWebIdentityで交換する構成にすることで、
 * 静的なAWSアクセスキーをVercel側の環境変数に置かずに済む。
 * Vercel側では @vercel/oidc-aws-credentials-provider の awsCredentialsProvider({ roleArn, audience: "sts.amazonaws.com" })
 * にこのスタックが出力するロールARNを渡す。
 */
export class VercelOidcStack extends cdk.Stack {
  public readonly bedrockAccessRole: iam.Role;

  constructor(scope: Construct, id: string, props: VercelOidcStackProps) {
    super(scope, id, props);

    const { envConfig, bedrockInvokeModelPolicy } = props;
    const { envName } = envConfig;

    const issuerHost = `oidc.vercel.com/${VERCEL_TEAM_SLUG}`;

    // 1. OpenID Connect Provider for Vercel
    const provider = new iam.OpenIdConnectProvider(this, "VercelOidcProvider", {
      url: `https://${issuerHost}`,
      clientIds: ["sts.amazonaws.com"],
    });

    // 2. IAM Role assumable by Vercel Functions (production/preview環境のみ)
    const subConditions = VERCEL_PROJECT_NAMES.flatMap((projectName) => [
      `owner:${VERCEL_TEAM_SLUG}:project:${projectName}:environment:production`,
      `owner:${VERCEL_TEAM_SLUG}:project:${projectName}:environment:preview`,
    ]);

    const projectList = VERCEL_PROJECT_NAMES.join(", ");

    this.bedrockAccessRole = new iam.Role(this, "VercelBedrockAccessRole", {
      roleName: `MiraiGikaiVercelBedrockAccessRole-${envName}`,
      description: `IAM Role for Vercel (${projectList}) to invoke Bedrock via OIDC (${envName})`,
      assumedBy: new iam.FederatedPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            [`${issuerHost}:aud`]: "sts.amazonaws.com",
          },
          StringLike: {
            [`${issuerHost}:sub`]: subConditions,
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // 3. Bedrock呼び出し権限を付与
    this.bedrockAccessRole.addManagedPolicy(bedrockInvokeModelPolicy);

    // 4. Output Role ARN (Vercelプロジェクトの AWS_ROLE_ARN 環境変数に設定する)
    new cdk.CfnOutput(this, "VercelBedrockAccessRoleArn", {
      value: this.bedrockAccessRole.roleArn,
      description:
        "ARN of the IAM Role for Vercel OIDC Federation to invoke Bedrock",
      exportName: `MiraiGikaiVercelBedrockAccessRoleArn-${envName}`,
    });
  }
}
