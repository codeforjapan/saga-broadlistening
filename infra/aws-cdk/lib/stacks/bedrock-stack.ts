import { Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import type { EnvConfig } from "../config/types";

export interface BedrockStackProps extends StackProps {
  readonly envConfig: EnvConfig;
}

/**
 * Lambda等からBedrockの基盤モデルを呼び出すためのIAM権限を管理するスタック。
 * モデル固有の設定（モデルID等）はLambda側の環境変数で指定し、
 * ここでは呼び出し可能なリソース範囲の権限のみを定義する。
 */
export class BedrockStack extends Stack {
  public readonly invokeModelPolicy: iam.ManagedPolicy;

  constructor(scope: Construct, id: string, props: BedrockStackProps) {
    super(scope, id, props);

    const { envName, region, account } = props.envConfig;

    this.invokeModelPolicy = new iam.ManagedPolicy(
      this,
      "BedrockInvokeModelPolicy",
      {
        managedPolicyName: `mirai-gikai-bedrock-invoke-${envName}`,
        statements: [
          new iam.PolicyStatement({
            sid: "InvokeFoundationModels",
            effect: iam.Effect.ALLOW,
            actions: [
              "bedrock:InvokeModel",
              "bedrock:InvokeModelWithResponseStream",
            ],
            resources: [
              `arn:aws:bedrock:${region}::foundation-model/*`,
              `arn:aws:bedrock:${region}:${account}:inference-profile/*`,
            ],
          }),
          new iam.PolicyStatement({
            sid: "ListFoundationModels",
            effect: iam.Effect.ALLOW,
            actions: ["bedrock:ListFoundationModels"],
            resources: ["*"],
          }),
        ],
      }
    );
  }
}
