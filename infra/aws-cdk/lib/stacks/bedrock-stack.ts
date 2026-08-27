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

// 日本CRIS（jp.*プレフィックス）の宛先リージョン。AWS公式モデルカードで確認済み。
// inference profileをResourceに指定する場合、AWS公式ドキュメントにより
// ルーティング先の各リージョンのfoundation modelも合わせて許可する必要がある。
const JP_CRIS_REGIONS = ["ap-northeast-1", "ap-northeast-3"] as const;

// jp.*経由で呼び出す（東京・大阪の両方にルーティングされ得る）foundation model。#43の採用モデル。
const JP_CRIS_MODELS = [
  "anthropic.claude-sonnet-4-6",
  "anthropic.claude-haiku-4-5-20251001-v1:0",
] as const;

// 東京In-Regionのみで完結し、CRISを経由しないfoundation model。#43の採用モデル。
const IN_REGION_ONLY_MODELS = ["openai.gpt-oss-120b-1:0"] as const;

// モデル呼び出し系アクション。Allow（InvokeFoundationModels）とDeny（global.*遮断）の
// 両方で同一のアクション集合を参照するため定数化し、片方だけ更新して保護が抜ける事故を防ぐ。
const BEDROCK_INVOKE_ACTIONS = [
  "bedrock:InvokeModel",
  "bedrock:InvokeModelWithResponseStream",
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
            actions: BEDROCK_INVOKE_ACTIONS,
            resources: [
              // inference profile自体は呼び出し元リージョンの日本CRISプロファイルのみ許可
              `arn:aws:bedrock:${region}:${account}:inference-profile/jp.*`,
              // JP CRISのルーティング先となる各リージョンのfoundation modelを許可
              ...JP_CRIS_MODELS.flatMap((model) =>
                JP_CRIS_REGIONS.map(
                  (crisRegion) =>
                    `arn:aws:bedrock:${crisRegion}::foundation-model/${model}`
                )
              ),
              // 東京In-Region専用モデルは東京のfoundation modelのみ許可
              ...IN_REGION_ONLY_MODELS.map(
                (model) => `arn:aws:bedrock:${region}::foundation-model/${model}`
              ),
            ],
          }),
          // global.*（全世界ルーティング）を明示的に遮断する。AWS公式が案内する
          // 「aws:RequestedRegionがunspecifiedの場合をDeny」パターン。DenyはAllowを
          // 上書きするため、誤って上のstatementがglobal.*にマッチしても遮断される。
          new iam.PolicyStatement({
            sid: "DenyGlobalCrossRegionRouting",
            effect: iam.Effect.DENY,
            actions: BEDROCK_INVOKE_ACTIONS,
            resources: ["*"],
            conditions: {
              StringEquals: { "aws:RequestedRegion": "unspecified" },
            },
          }),
          // ARN直指定でglobal.*が渡された場合の保険としてResourceベースでも遮断する。
          new iam.PolicyStatement({
            sid: "DenyGlobalInferenceProfile",
            effect: iam.Effect.DENY,
            actions: BEDROCK_INVOKE_ACTIONS,
            resources: [
              `arn:aws:bedrock:${region}:${account}:inference-profile/global.*`,
            ],
          }),
          new iam.PolicyStatement({
            sid: "ListFoundationModels",
            effect: iam.Effect.ALLOW,
            actions: ["bedrock:ListFoundationModels"],
            resources: ["*"],
          }),
          // AWS Marketplace経由で提供されるfoundation model（Anthropic等）は、
          // 呼び出し元IAMプリンシパル自身がこの2アクションの権限を持っていないと、
          // アカウント全体で既にサブスクライブ済みでも
          // "not authorized to perform ... aws-marketplace:Subscribe" で拒否される
          // （実機で確認済み）。AWS Marketplaceはリソースレベルの権限指定に対応して
          // いないため Resource は "*" 固定になる。
          new iam.PolicyStatement({
            sid: "SubscribeMarketplaceModels",
            effect: iam.Effect.ALLOW,
            actions: [
              "aws-marketplace:ViewSubscriptions",
              "aws-marketplace:Subscribe",
            ],
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
