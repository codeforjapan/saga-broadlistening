import { Stack, type StackProps } from "aws-cdk-lib";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import type { EnvConfig } from "../config/types";

export interface BedrockStackProps extends StackProps {
  readonly envConfig: EnvConfig;
}

// PROMPT_ATTACKはモデルの応答(output)には適用できず、Bedrock側がoutputStrength: "NONE"を
// 要求するため、他のフィルタ種別（input/output共にMEDIUM）とは別に定義する。
const BIDIRECTIONAL_CONTENT_FILTER_TYPES = [
  "HATE",
  "INSULTS",
  "SEXUAL",
  "VIOLENCE",
  "MISCONDUCT",
];

/**
 * Lambda等からBedrockの基盤モデルを呼び出すためのIAM権限、および有害コンテンツを
 * 検知・ブロックするデフォルトGuardrailを管理するスタック。
 * モデル固有の設定（モデルID等）はLambda側の環境変数で指定し、
 * ここでは呼び出し可能なリソース範囲の権限とGuardrail自体の定義のみを行う。
 */
export class BedrockStack extends Stack {
  public readonly invokeModelPolicy: iam.ManagedPolicy;
  public readonly guardrail: bedrock.CfnGuardrail;
  public readonly guardrailVersion: bedrock.CfnGuardrailVersion;

  constructor(scope: Construct, id: string, props: BedrockStackProps) {
    super(scope, id, props);

    const { envName, region, account } = props.envConfig;

    this.guardrail = new bedrock.CfnGuardrail(this, "Guardrail", {
      name: `mirai-gikai-guardrail-${envName}`,
      description:
        "有害コンテンツ（ヘイト・侮辱・性的表現・暴力・不正行為・プロンプトインジェクション）を検知しブロックするデフォルトGuardrail",
      blockedInputMessaging:
        "入力内容に不適切な表現が含まれているため処理できませんでした。",
      blockedOutputsMessaging:
        "生成結果に不適切な内容が含まれる可能性があるため出力をブロックしました。",
      contentPolicyConfig: {
        filtersConfig: [
          ...BIDIRECTIONAL_CONTENT_FILTER_TYPES.map((type) => ({
            type,
            inputStrength: "MEDIUM",
            outputStrength: "MEDIUM",
          })),
          {
            type: "PROMPT_ATTACK",
            inputStrength: "MEDIUM",
            outputStrength: "NONE",
          },
        ],
      },
    });

    // DRAFTバージョンは変更され得るため、Lambda等からは発行済みバージョンを参照する
    this.guardrailVersion = new bedrock.CfnGuardrailVersion(
      this,
      "GuardrailVersion",
      {
        guardrailIdentifier: this.guardrail.attrGuardrailId,
        description: `mirai-gikai-guardrail-${envName} published version`,
      }
    );

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
          new iam.PolicyStatement({
            sid: "ApplyGuardrail",
            effect: iam.Effect.ALLOW,
            actions: ["bedrock:ApplyGuardrail"],
            resources: [this.guardrail.attrGuardrailArn],
          }),
        ],
      }
    );
  }
}
