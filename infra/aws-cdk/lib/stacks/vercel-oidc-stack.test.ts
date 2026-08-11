import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { createTestVercelOidcStack } from "./test-support";

describe("VercelOidcStack", () => {
  it("Vercel用OIDCプロバイダーを作成する", () => {
    const { vercelOidcStack } = createTestVercelOidcStack("Test1", "dev");

    const template = Template.fromStack(vercelOidcStack);

    template.hasResourceProperties("Custom::AWSCDKOpenIdConnectProvider", {
      Url: "https://oidc.vercel.com/c4j",
      ClientIDList: ["sts.amazonaws.com"],
    });
  });

  it("Vercel Bedrockアクセス用IAMロールを作成し信頼条件を検証する", () => {
    const { vercelOidcStack, envConfig } = createTestVercelOidcStack(
      "Test2",
      "dev"
    );

    const template = Template.fromStack(vercelOidcStack);

    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: `MiraiGikaiVercelBedrockAccessRole-${envConfig.envName}`,
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Allow",
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringEquals: {
                "oidc.vercel.com/c4j:aud": "sts.amazonaws.com",
              },
              StringLike: {
                "oidc.vercel.com/c4j:sub": [
                  "owner:c4j:project:saga-kocho-web:environment:production",
                  "owner:c4j:project:saga-kocho-web:environment:preview",
                  "owner:c4j:project:saga-kocho-admin:environment:production",
                  "owner:c4j:project:saga-kocho-admin:environment:preview",
                ],
              },
            },
          }),
        ]),
      },
    });
  });

  it("BedrockInvokeModelPolicyをロールにアタッチする", () => {
    const { vercelOidcStack, envConfig } = createTestVercelOidcStack(
      "Test3",
      "dev"
    );

    const template = Template.fromStack(vercelOidcStack);

    const role = template.findResources("AWS::IAM::Role", {
      Properties: {
        RoleName: `MiraiGikaiVercelBedrockAccessRole-${envConfig.envName}`,
      },
    });
    const [bedrockAccessRole] = Object.values(role);
    expect(bedrockAccessRole.Properties.ManagedPolicyArns).toHaveLength(1);
  });

  it("Role ARNをCfnOutputとして出力する", () => {
    const { vercelOidcStack, envConfig } = createTestVercelOidcStack(
      "Test4",
      "prd"
    );

    const template = Template.fromStack(vercelOidcStack);

    template.hasOutput("VercelBedrockAccessRoleArn", {
      Export: {
        Name: `MiraiGikaiVercelBedrockAccessRoleArn-${envConfig.envName}`,
      },
    });
  });

  it("bedrockAccessRoleプロパティを公開する", () => {
    const { vercelOidcStack } = createTestVercelOidcStack("Test5", "dev");

    expect(vercelOidcStack.bedrockAccessRole).toBeDefined();
  });
});
