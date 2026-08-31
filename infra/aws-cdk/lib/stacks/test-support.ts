import { App } from "aws-cdk-lib";
import { resolveEnvConfig } from "../config/environments";
import type { EnvName } from "../config/types";
import { BedrockStack } from "./bedrock-stack";
import { LambdaStack } from "./lambda-stack";
import { TopicAnalysisStack } from "./topic-analysis-stack";
import { VercelOidcStack } from "./vercel-oidc-stack";

import { GitHubOidcStack } from "./github-oidc-stack";

/**
 * テスト用にBedrockStackを組み立てるヘルパー。
 * 各テストで同じセットアップコードを重複させないために使う。
 */
export function createTestBedrockStack(idPrefix: string, envName: EnvName) {
  const app = new App();
  const envConfig = resolveEnvConfig(envName);
  const bedrockStack = new BedrockStack(app, `${idPrefix}Bedrock`, {
    env: { account: envConfig.account, region: envConfig.region },
    envConfig,
  });

  return { app, envConfig, bedrockStack };
}

/**
 * テスト用にGitHubOidcStackを組み立てるヘルパー。
 */
export function createTestGitHubOidcStack(idPrefix: string, envName: EnvName) {
  const app = new App();
  const envConfig = resolveEnvConfig(envName);
  const githubOidcStack = new GitHubOidcStack(app, `${idPrefix}GitHubOidc`, {
    env: { account: envConfig.account, region: envConfig.region },
    envConfig,
  });

  return { app, envConfig, githubOidcStack };
}

/**
 * テスト用にBedrockStack・GitHubOidcStack・TopicAnalysisStack・VercelOidcStackを
 * 組み立てるヘルパー。VercelOidcStackはBedrockStackのポリシーとTopicAnalysisStackの
 * Job Queue/Job Definition ARNに依存するため、4つまとめて構築する。
 */
export function createTestVercelOidcStack(idPrefix: string, envName: EnvName) {
  const { app, envConfig, bedrockStack, githubOidcStack, topicAnalysisStack } =
    createTestTopicAnalysisStack(idPrefix, envName);

  const vercelOidcStack = new VercelOidcStack(app, `${idPrefix}VercelOidc`, {
    env: { account: envConfig.account, region: envConfig.region },
    envConfig,
    bedrockInvokeModelPolicy: bedrockStack.invokeModelPolicy,
    topicAnalysisJobQueueArn: topicAnalysisStack.jobQueue.jobQueueArn,
    topicAnalysisJobDefinitionArn:
      topicAnalysisStack.jobDefinition.jobDefinitionArn,
  });

  return {
    app,
    envConfig,
    bedrockStack,
    githubOidcStack,
    topicAnalysisStack,
    vercelOidcStack,
  };
}

/**
 * テスト用にBedrockStackとLambdaStackを組み立てるヘルパー。
 * LambdaStackはBedrockStackのポリシーに依存するため、両方をまとめて構築する。
 */
export function createTestStacks(idPrefix: string, envName: EnvName) {
  const { app, envConfig, bedrockStack } = createTestBedrockStack(
    idPrefix,
    envName
  );

  const lambdaStack = new LambdaStack(app, `${idPrefix}Lambda`, {
    env: { account: envConfig.account, region: envConfig.region },
    envConfig,
    bedrockInvokeModelPolicy: bedrockStack.invokeModelPolicy,
    guardrailId: bedrockStack.guardrail.attrGuardrailId,
    guardrailVersion: bedrockStack.guardrailVersion.attrVersion,
  });

  return { app, envConfig, bedrockStack, lambdaStack };
}

/**
 * テスト用にBedrockStack・GitHubOidcStack・TopicAnalysisStackを組み立てるヘルパー。
 * TopicAnalysisStackはBedrockStackのポリシーとGitHubOidcStackのデプロイRoleに
 * 依存するため、3つまとめて構築する。
 */
export function createTestTopicAnalysisStack(
  idPrefix: string,
  envName: EnvName
) {
  const { app, envConfig, bedrockStack } = createTestBedrockStack(
    idPrefix,
    envName
  );

  const githubOidcStack = new GitHubOidcStack(app, `${idPrefix}GitHubOidc`, {
    env: { account: envConfig.account, region: envConfig.region },
    envConfig,
  });

  const topicAnalysisStack = new TopicAnalysisStack(
    app,
    `${idPrefix}TopicAnalysis`,
    {
      env: { account: envConfig.account, region: envConfig.region },
      envConfig,
      bedrockInvokeModelPolicy: bedrockStack.invokeModelPolicy,
      githubActionsDeployRole: githubOidcStack.deployRole,
    }
  );

  return { app, envConfig, bedrockStack, githubOidcStack, topicAnalysisStack };
}

