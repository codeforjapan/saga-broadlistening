import * as path from "node:path";
import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import type * as iam from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";
import type { EnvConfig } from "../config/types";

export interface LambdaStackProps extends StackProps {
  readonly envConfig: EnvConfig;
  readonly bedrockInvokeModelPolicy: iam.IManagedPolicy;
}

/**
 * Bedrock疎通確認用のLambda関数を管理するスタック。
 * 実際の業務ロジックが決まったら、このLambdaを置き換えるか、
 * 同パターンで新しい関数を追加していく想定。
 */
export class LambdaStack extends Stack {
  public readonly bedrockHealthCheckFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const { envName, bedrockModelId } = props.envConfig;

    this.bedrockHealthCheckFunction = new NodejsFunction(
      this,
      "BedrockHealthCheckFunction",
      {
        functionName: `mirai-gikai-bedrock-health-check-${envName}`,
        entry: path.join(
          __dirname,
          "../../src/handlers/bedrock-health-check/index.ts"
        ),
        handler: "handler",
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.seconds(30),
        environment: {
          BEDROCK_MODEL_ID: bedrockModelId,
        },
      }
    );

    const { role } = this.bedrockHealthCheckFunction;
    if (!role) {
      throw new Error(
        "BedrockHealthCheckFunction has no execution role to attach the Bedrock invoke policy to."
      );
    }
    role.addManagedPolicy(props.bedrockInvokeModelPolicy);
  }
}
