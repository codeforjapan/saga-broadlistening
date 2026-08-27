import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { createTestBedrockStack } from "./test-support";

describe("BedrockStack", () => {
  it("Bedrockモデル呼び出し用のManagedPolicyを作成する", () => {
    const { bedrockStack } = createTestBedrockStack("Test1", "dev");

    const template = Template.fromStack(bedrockStack);

    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      ManagedPolicyName: "mirai-gikai-bedrock-invoke-dev",
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "InvokeFoundationModels",
            Effect: "Allow",
            Action: [
              "bedrock:InvokeModel",
              "bedrock:InvokeModelWithResponseStream",
            ],
            Resource: [
              "arn:aws:bedrock:ap-northeast-1:826784631888:inference-profile/jp.*",
              "arn:aws:bedrock:ap-northeast-1::foundation-model/anthropic.claude-sonnet-4-6",
              "arn:aws:bedrock:ap-northeast-3::foundation-model/anthropic.claude-sonnet-4-6",
              "arn:aws:bedrock:ap-northeast-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
              "arn:aws:bedrock:ap-northeast-3::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
              "arn:aws:bedrock:ap-northeast-1::foundation-model/openai.gpt-oss-120b-1:0",
            ],
          }),
        ]),
      },
    });
  });

  it("inference profileはjp.*のみに限定し、global.等を含むワイルドカードは許可しない", () => {
    const { bedrockStack } = createTestBedrockStack("Test11", "dev");

    const template = Template.fromStack(bedrockStack);

    const [policy] = Object.values(
      template.findResources("AWS::IAM::ManagedPolicy")
    );
    const statement = policy.Properties.PolicyDocument.Statement.find(
      (s: { Sid?: string }) => s.Sid === "InvokeFoundationModels"
    );
    const inferenceProfileResources = (statement.Resource as string[]).filter(
      (r) => r.includes(":inference-profile/")
    );
    expect(inferenceProfileResources).toEqual([
      "arn:aws:bedrock:ap-northeast-1:826784631888:inference-profile/jp.*",
    ]);
  });

  it("aws:RequestedRegionがunspecified（global.*経由）の呼び出しをDenyする", () => {
    const { bedrockStack } = createTestBedrockStack("Test12", "dev");

    const template = Template.fromStack(bedrockStack);

    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "DenyGlobalCrossRegionRouting",
            Effect: "Deny",
            Action: [
              "bedrock:InvokeModel",
              "bedrock:InvokeModelWithResponseStream",
            ],
            Resource: "*",
            Condition: {
              StringEquals: { "aws:RequestedRegion": "unspecified" },
            },
          }),
        ]),
      },
    });
  });

  it("inference-profile/global.*を直接指定した呼び出しもDenyする", () => {
    const { bedrockStack } = createTestBedrockStack("Test13", "dev");

    const template = Template.fromStack(bedrockStack);

    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "DenyGlobalInferenceProfile",
            Effect: "Deny",
            Resource: "arn:aws:bedrock:ap-northeast-1:826784631888:inference-profile/global.*",
          }),
        ]),
      },
    });
  });

  it("モデル一覧取得（ListFoundationModels）の権限も付与する", () => {
    const { bedrockStack } = createTestBedrockStack("Test4", "dev");

    const template = Template.fromStack(bedrockStack);

    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "ListFoundationModels",
            Effect: "Allow",
            Action: "bedrock:ListFoundationModels",
            Resource: "*",
          }),
        ]),
      },
    });
  });

  it("環境ごとにManagedPolicy名が変わる", () => {
    const { bedrockStack } = createTestBedrockStack("Test2", "prd");

    const template = Template.fromStack(bedrockStack);

    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      ManagedPolicyName: "mirai-gikai-bedrock-invoke-prd",
    });
  });

  it("invokeModelPolicyプロパティとしてポリシーを公開する", () => {
    const { bedrockStack } = createTestBedrockStack("Test3", "dev");

    expect(bedrockStack.invokeModelPolicy).toBeDefined();
  });

  it("有害コンテンツを検知・ブロックするGuardrailを作成する", () => {
    const { bedrockStack } = createTestBedrockStack("Test5", "dev");

    const template = Template.fromStack(bedrockStack);

    template.hasResourceProperties("AWS::Bedrock::Guardrail", {
      Name: "mirai-gikai-guardrail-dev",
      ContentPolicyConfig: {
        FiltersConfig: Match.arrayWith([
          Match.objectLike({
            Type: "HATE",
            InputStrength: "MEDIUM",
            OutputStrength: "MEDIUM",
          }),
        ]),
      },
    });
  });

  it("PROMPT_ATTACKフィルタはoutputStrengthをNONEにする（Bedrock APIの制約）", () => {
    const { bedrockStack } = createTestBedrockStack("Test9", "dev");

    const template = Template.fromStack(bedrockStack);

    template.hasResourceProperties("AWS::Bedrock::Guardrail", {
      ContentPolicyConfig: {
        FiltersConfig: Match.arrayWith([
          Match.objectLike({
            Type: "PROMPT_ATTACK",
            InputStrength: "MEDIUM",
            OutputStrength: "NONE",
          }),
        ]),
      },
    });
  });

  it("Guardrailの発行済みバージョンを作成する", () => {
    const { bedrockStack } = createTestBedrockStack("Test6", "dev");

    const template = Template.fromStack(bedrockStack);

    template.resourceCountIs("AWS::Bedrock::GuardrailVersion", 1);
  });

  it("ApplyGuardrail権限をGuardrail ARNに限定して付与する", () => {
    const { bedrockStack } = createTestBedrockStack("Test7", "dev");

    const template = Template.fromStack(bedrockStack);

    template.hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "ApplyGuardrail",
            Effect: "Allow",
            Action: "bedrock:ApplyGuardrail",
            Resource: Match.objectLike({
              "Fn::GetAtt": Match.arrayWith(["Guardrail"]),
            }),
          }),
        ]),
      },
    });
  });

  it("guardrail/guardrailVersionプロパティを公開する", () => {
    const { bedrockStack } = createTestBedrockStack("Test8", "dev");

    expect(bedrockStack.guardrail).toBeDefined();
    expect(bedrockStack.guardrailVersion).toBeDefined();
  });
});
