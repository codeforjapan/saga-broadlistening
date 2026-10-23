import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { EnvConfig } from "../config/types";

export interface GitHubOidcStackProps extends cdk.StackProps {
  readonly envConfig: EnvConfig;
}

export class GitHubOidcStack extends cdk.Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    const { envConfig } = props;

    // 1. OpenID Connect Provider for GitHub Actions
    const provider = new iam.OpenIdConnectProvider(this, "GitHubOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    // 2. IAM Role for GitHub Actions Deploy
    this.deployRole = new iam.Role(this, "GitHubActionsDeployRole", {
      roleName: `MiraiGikaiGitHubActionsDeployRole-${envConfig.envName}`,
      description: `IAM Role for GitHub Actions deployment (${envConfig.envName})`,
      assumedBy: new iam.FederatedPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": [
              `repo:codeforjapan/saga-broadlistening:ref:refs/heads/${envConfig.trustedBranch}`,
              `repo:codeforjapan/saga-broadlistening:environment:${envConfig.trustedGithubEnvironment}`,
              "repo:codeforjapan/saga-broadlistening:pull_request",
              "repo:codeforjapan/saga-broadlistening:ref:refs/pull/*",
            ],
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // 3. Allow AssumeRole for CDK Bootstrap roles
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowCDKBootstrapRoleAssume",
        actions: ["sts:AssumeRole"],
        resources: [
          `arn:aws:iam::${this.account}:role/cdk-hnb659fds-*-${this.account}-${this.region}`,
        ],
      })
    );

    // 4. ECR push（#48）: ecr:GetAuthorizationTokenはリソースレベル権限をサポートせず
    // "*"が必須のためここで付与する。リポジトリ単位のpush権限（PutImage等）は
    // ECRのリソースポリシー側で付与する（TopicAnalysisStackのRepository参照）。
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "EcrAuthToken",
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      })
    );

    // 5. Output Deploy Role ARN
    new cdk.CfnOutput(this, "GitHubActionsDeployRoleArn", {
      value: this.deployRole.roleArn,
      description: "ARN of the IAM Role for GitHub Actions Deployment",
      exportName: `MiraiGikaiGitHubActionsDeployRoleArn-${envConfig.envName}`,
    });
  }
}
