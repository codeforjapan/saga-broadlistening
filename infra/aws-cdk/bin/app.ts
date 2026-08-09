#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { resolveEnvConfig } from "../lib/config/environments";
import { BedrockStack } from "../lib/stacks/bedrock-stack";
import { LambdaStack } from "../lib/stacks/lambda-stack";

const app = new App();

const envName = app.node.tryGetContext("env");
if (!envName) {
  throw new Error(
    'Missing required context "env". Pass it with --context env=dev|stg|prd (e.g. `cdk synth --context env=dev`).'
  );
}

const envConfig = resolveEnvConfig(envName);
const env = { account: envConfig.account, region: envConfig.region };

const bedrockStack = new BedrockStack(
  app,
  `MiraiGikaiBedrockStack-${envConfig.envName}`,
  { env, envConfig }
);

new LambdaStack(app, `MiraiGikaiLambdaStack-${envConfig.envName}`, {
  env,
  envConfig,
  bedrockInvokeModelPolicy: bedrockStack.invokeModelPolicy,
});
