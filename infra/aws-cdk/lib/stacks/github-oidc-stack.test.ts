import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { createTestGitHubOidcStack } from "./test-support";

describe("GitHubOidcStack", () => {
  it("GitHub用OIDCプロバイダーを作成する", () => {
    const { githubOidcStack } = createTestGitHubOidcStack("Test1", "dev");

    const template = Template.fromStack(githubOidcStack);

    template.hasResourceProperties("Custom::AWSCDKOpenIdConnectProvider", {
      Url: "https://token.actions.githubusercontent.com",
      ClientIDList: ["sts.amazonaws.com"],
    });
  });

  it("GitHub Actionsデプロイ用IAMロールを作成し、dev環境はdevelopブランチ/staging Environmentを信頼する", () => {
    const { githubOidcStack, envConfig } = createTestGitHubOidcStack("Test2", "dev");

    const template = Template.fromStack(githubOidcStack);

    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: `MiraiGikaiGitHubActionsDeployRole-${envConfig.envName}`,
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Allow",
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringEquals: {
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
              },
              StringLike: {
                "token.actions.githubusercontent.com:sub": [
                  "repo:codeforjapan/saga-broadlistening:ref:refs/heads/develop",
                  "repo:codeforjapan/saga-broadlistening:environment:staging",
                  "repo:codeforjapan/saga-broadlistening:pull_request",
                  "repo:codeforjapan/saga-broadlistening:ref:refs/pull/*",
                ],
              },
            },
          }),
        ]),
      },
    });
  });

  it("GitHub Actionsデプロイ用IAMロールを作成し、prd環境はmainブランチ/production Environmentを信頼する", () => {
    const { githubOidcStack, envConfig } = createTestGitHubOidcStack("Test2b", "prd");

    const template = Template.fromStack(githubOidcStack);

    template.hasResourceProperties("AWS::IAM::Role", {
      RoleName: `MiraiGikaiGitHubActionsDeployRole-${envConfig.envName}`,
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Allow",
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringEquals: {
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
              },
              StringLike: {
                "token.actions.githubusercontent.com:sub": [
                  "repo:codeforjapan/saga-broadlistening:ref:refs/heads/main",
                  "repo:codeforjapan/saga-broadlistening:environment:production",
                  "repo:codeforjapan/saga-broadlistening:pull_request",
                  "repo:codeforjapan/saga-broadlistening:ref:refs/pull/*",
                ],
              },
            },
          }),
        ]),
      },
    });
  });

  it("CDK Bootstrapロールへのsts:AssumeRole権限ポリシーを割り当てる", () => {
    const { githubOidcStack, envConfig } = createTestGitHubOidcStack("Test3", "prd");

    const template = Template.fromStack(githubOidcStack);

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "AllowCDKBootstrapRoleAssume",
            Effect: "Allow",
            Action: "sts:AssumeRole",
            Resource: `arn:aws:iam::${envConfig.account}:role/cdk-hnb659fds-*-${envConfig.account}-${envConfig.region}`,
          }),
        ]),
      },
    });
  });

  it("ecr:GetAuthorizationTokenをリソース*で付与する（ECRの仕様上必須）", () => {
    const { githubOidcStack } = createTestGitHubOidcStack("Test3b", "prd");

    const template = Template.fromStack(githubOidcStack);

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "EcrAuthToken",
            Effect: "Allow",
            Action: "ecr:GetAuthorizationToken",
            Resource: "*",
          }),
        ]),
      },
    });
  });

  it("Role ARNをCfnOutputとして出力する", () => {
    const { githubOidcStack } = createTestGitHubOidcStack("Test4", "prd");

    const template = Template.fromStack(githubOidcStack);

    template.hasOutput("GitHubActionsDeployRoleArn", {
      Export: {
        Name: "MiraiGikaiGitHubActionsDeployRoleArn-prd",
      },
    });
  });

  it("deployRoleプロパティを公開する", () => {
    const { githubOidcStack } = createTestGitHubOidcStack("Test5", "dev");

    expect(githubOidcStack.deployRole).toBeDefined();
  });
});
