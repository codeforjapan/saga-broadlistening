import { App } from "aws-cdk-lib";
import { resolveEnvConfig } from "../config/environments";
import type { EnvName } from "../config/types";
import { BedrockStack } from "./bedrock-stack";
import { LambdaStack } from "./lambda-stack";

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

