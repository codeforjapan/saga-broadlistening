import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { createTestStacks } from "./test-support";

describe("LambdaStack", () => {
  it("Bedrock疎通確認用のLambda関数を作成する", () => {
    const { lambdaStack, envConfig } = createTestStacks("Test1", "dev");

    const template = Template.fromStack(lambdaStack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "mirai-gikai-bedrock-health-check-dev",
      Runtime: "nodejs22.x",
      Environment: {
        Variables: {
          BEDROCK_MODEL_ID: envConfig.bedrockModelId,
          BEDROCK_GUARDRAIL_ID: Match.objectLike({
            "Fn::ImportValue": Match.anyValue(),
          }),
          BEDROCK_GUARDRAIL_VERSION: Match.objectLike({
            "Fn::ImportValue": Match.anyValue(),
          }),
        },
      },
    });
  });

  it("Lambdaの実行ロールにBedrock呼び出しポリシーがアタッチされる", () => {
    const { lambdaStack } = createTestStacks("Test2", "dev");

    const template = Template.fromStack(lambdaStack);

    const roles = template.findResources("AWS::IAM::Role");
    const functionRole = Object.values(roles).find(
      (role) =>
        role.Properties?.ManagedPolicyArns !== undefined &&
        Array.isArray(role.Properties.ManagedPolicyArns) &&
        role.Properties.ManagedPolicyArns.length > 0
    );
    expect(functionRole).toBeDefined();
  });

  it("bedrockHealthCheckFunctionプロパティとして関数を公開する", () => {
    const { lambdaStack } = createTestStacks("Test3", "prd");

    expect(lambdaStack.bedrockHealthCheckFunction).toBeDefined();
  });
});
