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
              "arn:aws:bedrock:ap-northeast-1::foundation-model/*",
              "arn:aws:bedrock:ap-northeast-1:826784631888:inference-profile/*",
            ],
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
});
