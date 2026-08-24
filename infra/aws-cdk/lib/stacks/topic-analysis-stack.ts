import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import type { EnvConfig } from "../config/types";

export interface TopicAnalysisStackProps extends cdk.StackProps {
  readonly envConfig: EnvConfig;
  readonly bedrockInvokeModelPolicy: iam.IManagedPolicy;
  /** worker imageをpushするGitHub ActionsのデプロイRole（ECRリポジトリポリシーの付与先）。 */
  readonly githubActionsDeployRole: iam.IRole;
}

// 全議案の増分トピック分析。GCP Cloud Run Job時代のSCHEDULER_CRON(0 6 * * *)と同じ時刻。
const SCHEDULE_EXPRESSION = "cron(0 6 * * ? *)";
const SCHEDULE_TIMEZONE = "Asia/Tokyo";
const DEFAULT_COMMAND = ["--mode=analyze-all"];
const TASK_CPU = 1024;
const TASK_MEMORY_MIB = 2048;
const VPC_MAX_AZS = 2;

// worker(src/main.ts)が起動時に必須チェックする環境変数。SUPABASE_* に加え、
// topic-analysis-coreがまだAI Gateway経由でモデル呼び出しをしているため
// AI_GATEWAY_API_KEYも必要（Bedrock直呼び出しへの切替は別issueの対応事項で、
// 完了後はここから外せる）。
const WORKER_SECRETS = [
  { id: "SupabaseUrlSecret", envVar: "SUPABASE_URL" },
  { id: "SupabaseSecretKeySecret", envVar: "SUPABASE_SECRET_KEY" },
  { id: "AiGatewayApiKeySecret", envVar: "AI_GATEWAY_API_KEY" },
] as const;
type WorkerSecretEnvVar = (typeof WORKER_SECRETS)[number]["envVar"];

/**
 * トピック分析・意見再抽出バックフィルworkerの実行基盤（ECS Fargate + EventBridge Scheduler）。
 * GCP Cloud Run Job（infra/cloud-run）からの移行先（#48）。admin からの手動起動（#49）は
 * このスタックが公開する cluster / taskDefinition / taskRole / executionRole を使って
 * ecs:RunTask を呼ぶ想定。
 *
 * worker の通信先（Supabase / Bedrock / Langfuse Cloud）はいずれも公開エンドポイントのため、
 * NAT Gatewayを作らずパブリックサブネット + assignPublicIp:ENABLEDで構成する
 * （プライベートサブネット+NATは月$30〜が常時かかるが、バッチ実行のこのworkerには不要）。
 */
export class TopicAnalysisStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly repository: ecr.Repository;
  public readonly cluster: ecs.Cluster;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly taskRole: iam.Role;
  public readonly executionRole: iam.Role;
  public readonly taskSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: TopicAnalysisStackProps) {
    super(scope, id, props);

    const { envName } = props.envConfig;

    this.vpc = this.createVpc();
    this.repository = this.createRepository(
      envName,
      props.githubActionsDeployRole
    );
    this.cluster = new ecs.Cluster(this, "Cluster", {
      clusterName: `mirai-gikai-topic-analysis-${envName}`,
      vpc: this.vpc,
    });
    this.taskRole = this.createTaskRole(envName, props.bedrockInvokeModelPolicy);
    this.executionRole = this.createExecutionRole(envName);
    this.taskDefinition = this.createTaskDefinition(envName);
    this.taskSecurityGroup = new ec2.SecurityGroup(this, "TaskSecurityGroup", {
      vpc: this.vpc,
      description: "topic-analysis worker task (outbound only)",
      allowAllOutbound: true,
    });

    this.createSchedule(envName, props.envConfig.topicAnalysisSchedulerEnabled);
  }

  private createVpc(): ec2.Vpc {
    // ec2.Vpcはaccountの実在AZ一覧をstack.availabilityZones経由で問い合わせるため、
    // cdk synth/diff/deployにはAWS認証情報が必要（AZを明示指定しても同様）。
    // 初回はAWS_PROFILE付きで実行し、生成されるcdk.context.jsonをコミットすること
    // （2回目以降はキャッシュがあるため認証不要になる）。
    return new ec2.Vpc(this, "Vpc", {
      maxAzs: VPC_MAX_AZS,
      natGateways: 0,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
      ],
    });
  }

  private createRepository(
    envName: string,
    githubActionsDeployRole: iam.IRole
  ): ecr.Repository {
    const repository = new ecr.Repository(this, "Repository", {
      repositoryName: `mirai-gikai-topic-analysis-worker-${envName}`,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          description: "保存コストを抑えるため直近10件のみ保持する",
          maxImageCount: 10,
        },
      ],
    });
    // GitHub ActionsからのpushはこのリポジトリのリソースポリシーでRole ARNを直接許可する
    // （リポジトリ名の重複管理やスタック間参照を避けるため、GitHubOidcStack側ではなく
    // リポジトリ自体を作るこちらでポリシーを持つ。ecr:GetAuthorizationTokenはリソース
    // レベル権限が無いため、そちらはGitHubOidcStackのRoleポリシー側で付与している）。
    repository.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowGitHubActionsPush",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ArnPrincipal(githubActionsDeployRole.roleArn)],
        actions: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ],
      })
    );
    return repository;
  }

  private createTaskRole(
    envName: string,
    bedrockInvokeModelPolicy: iam.IManagedPolicy
  ): iam.Role {
    // タスク自身（アプリケーションコード）が引き受けるロール。Bedrock呼び出し権限のみを持つ。
    // これによりVercel OIDCと同様、GCPサービスアカウント鍵のような静的資格情報が不要になる。
    const taskRole = new iam.Role(this, "TaskRole", {
      roleName: `mirai-gikai-topic-analysis-task-${envName}`,
      description:
        "Role assumed by the topic-analysis worker container itself (Bedrock invoke)",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    taskRole.addManagedPolicy(bedrockInvokeModelPolicy);
    return taskRole;
  }

  private createExecutionRole(envName: string): iam.Role {
    // ECSエージェントが引き受けるロール（イメージpull・ログ書き込み・Secrets読み取り）。
    return new iam.Role(this, "ExecutionRole", {
      roleName: `mirai-gikai-topic-analysis-execution-${envName}`,
      description:
        "Role for ECR image pull, CloudWatch Logs, and Secrets Manager read",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });
  }

  private createTaskDefinition(envName: string): ecs.FargateTaskDefinition {
    // 値はCDKでは発行せず空のSecretとして作成する。
    // デプロイ後に`aws secretsmanager put-secret-value`で実値を設定すること。
    const secretsByEnvVar = Object.fromEntries(
      WORKER_SECRETS.map(({ id, envVar }) => [
        envVar,
        new secretsmanager.Secret(this, id, {
          secretName: `mirai-gikai-topic-analysis-worker-${envName}/${envVar}`,
          description: `topic-analysis worker用 ${envVar}（デプロイ後に実値を設定すること）`,
        }),
      ])
    ) as Record<WorkerSecretEnvVar, secretsmanager.Secret>;
    for (const secret of Object.values(secretsByEnvVar)) {
      secret.grantRead(this.executionRole);
    }

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: `/mirai-gikai/topic-analysis-worker-${envName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        family: `mirai-gikai-topic-analysis-worker-${envName}`,
        cpu: TASK_CPU,
        memoryLimitMiB: TASK_MEMORY_MIB,
        taskRole: this.taskRole,
        executionRole: this.executionRole,
      }
    );
    taskDefinition.addContainer("worker", {
      containerName: "worker",
      image: ecs.ContainerImage.fromEcrRepository(this.repository, "latest"),
      // RunTask呼び出し側(admin #49 / EventBridge Scheduler)のcontainerOverrides.commandで
      // 実際の--mode等を指定する前提（Cloud Run Jobの--argsと同じ構造）。
      command: DEFAULT_COMMAND,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "worker", logGroup }),
      secrets: Object.fromEntries(
        WORKER_SECRETS.map(({ envVar }) => [
          envVar,
          ecs.Secret.fromSecretsManager(secretsByEnvVar[envVar]),
        ])
      ),
    });
    return taskDefinition;
  }

  private createSchedule(
    envName: string,
    schedulerEnabled: boolean
  ): void {
    // EventBridge Schedulerがこのタスクを起動するためのロール。
    // リソースをタスク定義・ロールのARNで厳密に絞る（*にするとロールの権限昇格経路になる）。
    const schedulerExecutionRole = new iam.Role(
      this,
      "SchedulerExecutionRole",
      {
        roleName: `mirai-gikai-topic-analysis-scheduler-${envName}`,
        description:
          "Role assumed by EventBridge Scheduler to call ecs:RunTask",
        assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
      }
    );
    schedulerExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "RunTopicAnalysisTask",
        effect: iam.Effect.ALLOW,
        actions: ["ecs:RunTask"],
        resources: [this.taskDefinition.taskDefinitionArn],
        conditions: {
          ArnEquals: { "ecs:cluster": this.cluster.clusterArn },
        },
      })
    );
    schedulerExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "PassTaskRoles",
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [this.taskRole.roleArn, this.executionRole.roleArn],
        conditions: {
          StringEquals: { "iam:PassedToService": "ecs-tasks.amazonaws.com" },
        },
      })
    );

    // 毎朝6:00 JSTに全議案の増分トピック分析を実行する（GCP Cloud Schedulerの後継）。
    // 環境ごとに有効/無効を切り替えられるようにし、GCP側との二重実行を防ぐ。
    new scheduler.CfnSchedule(this, "AnalyzeAllSchedule", {
      name: `mirai-gikai-topic-analysis-analyze-all-${envName}`,
      description: "毎朝6:00 JSTに全議案の増分トピック分析を実行する",
      scheduleExpression: SCHEDULE_EXPRESSION,
      scheduleExpressionTimezone: SCHEDULE_TIMEZONE,
      state: schedulerEnabled ? "ENABLED" : "DISABLED",
      flexibleTimeWindow: { mode: "OFF" },
      target: {
        arn: this.cluster.clusterArn,
        roleArn: schedulerExecutionRole.roleArn,
        ecsParameters: {
          taskDefinitionArn: this.taskDefinition.taskDefinitionArn,
          launchType: "FARGATE",
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: this.vpc.publicSubnets.map((subnet) => subnet.subnetId),
              assignPublicIp: "ENABLED",
              securityGroups: [this.taskSecurityGroup.securityGroupId],
            },
          },
        },
        input: JSON.stringify({
          containerOverrides: [{ name: "worker", command: DEFAULT_COMMAND }],
        }),
      },
    });
  }
}
