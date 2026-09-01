#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { resolveEnvConfig } from "../lib/config/environments";
import { BedrockStack } from "../lib/stacks/bedrock-stack";
import { GitHubOidcStack } from "../lib/stacks/github-oidc-stack";
import { LambdaStack } from "../lib/stacks/lambda-stack";
import { TopicAnalysisStack } from "../lib/stacks/topic-analysis-stack";
import { VercelOidcStack } from "../lib/stacks/vercel-oidc-stack";

const app = new App();

const envName = app.node.tryGetContext("env");
if (!envName) {
  throw new Error(
    'Missing required context "env". Pass it with --context env=dev|stg|prd (e.g. `cdk synth --context env=dev`).'
  );
}

const envConfig = resolveEnvConfig(envName);
const env = { account: envConfig.account, region: envConfig.region };

const githubOidcStack = new GitHubOidcStack(
  app,
  `MiraiGikaiGitHubOidcStack-${envConfig.envName}`,
  { env, envConfig }
);

const bedrockStack = new BedrockStack(
  app,
  `MiraiGikaiBedrockStack-${envConfig.envName}`,
  { env, envConfig }
);

new LambdaStack(app, `MiraiGikaiLambdaStack-${envConfig.envName}`, {
  env,
  envConfig,
  bedrockInvokeModelPolicy: bedrockStack.invokeModelPolicy,
  guardrailId: bedrockStack.guardrail.attrGuardrailId,
  guardrailVersion: bedrockStack.guardrailVersion.attrVersion,
});

const topicAnalysisStack = new TopicAnalysisStack(
  app,
  `MiraiGikaiTopicAnalysisStack-${envConfig.envName}`,
  {
    env,
    envConfig,
    bedrockInvokeModelPolicy: bedrockStack.invokeModelPolicy,
    githubActionsDeployRole: githubOidcStack.deployRole,
  }
);

new VercelOidcStack(app, `MiraiGikaiVercelOidcStack-${envConfig.envName}`, {
  env,
  envConfig,
  bedrockInvokeModelPolicy: bedrockStack.invokeModelPolicy,
  topicAnalysisJobQueueArn: topicAnalysisStack.jobQueue.jobQueueArn,
  topicAnalysisJobDefinitionArn: topicAnalysisStack.jobDefinition.jobDefinitionArn,
});
