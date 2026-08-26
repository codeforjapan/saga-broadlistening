import * as cdk from "aws-cdk-lib";
import * as batch from "aws-cdk-lib/aws-batch";
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
const JOB_VCPUS = 1;
const JOB_MEMORY_MIB = 2048;
const COMPUTE_ENVIRONMENT_MAX_VCPUS = 4;
const VPC_MAX_AZS = 2;
// EventBridge SchedulerからAWS Batchを呼ぶuniversal target。
// CfnSchedule.TargetPropertyにはECS RunTaskのecsParametersに相当する
// Batch専用のテンプレート済みターゲットが無いため、aws-sdk universal targetを使う
// （実装時点でAWS公式ドキュメントとコミュニティ事例で存在は確認済みだが、
// Input JSONのキー名の大文字小文字はcdk deploy後に実機で疎通確認すること）。
const BATCH_SUBMIT_JOB_TARGET_ARN = "arn:aws:scheduler:::aws-sdk:batch:submitJob";

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
 * トピック分析・意見再抽出バックフィルworkerの実行基盤（AWS Batch on Fargate + EventBridge Scheduler）。
 * GCP Cloud Run Job（infra/cloud-run）からの移行先（#48）。当初はECS RunTaskを直接使う構成
 * だったが、呼び出しのたびにsubnet/SGを渡す必要がありadmin側（#49）にもインフラの詳細が
 * 漏れ出す問題があったため、AWS Batchへ移行した（#66）。ネットワーク設定はCompute
 * Environmentに一度だけ持たせ、呼び出し側はJob Queue / Job Definitionの参照だけで済む。
 *
 * worker の通信先（Supabase / Bedrock / Langfuse Cloud）はいずれも公開エンドポイントのため、
 * NAT Gatewayを作らずパブリックサブネット + assignPublicIp:trueで構成する
 * （プライベートサブネット+NATは月$30〜が常時かかるが、バッチ実行のこのworkerには不要）。
 */
export class TopicAnalysisStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly repository: ecr.Repository;
  public readonly taskRole: iam.Role;
  public readonly executionRole: iam.Role;
  public readonly taskSecurityGroup: ec2.SecurityGroup;
  public readonly jobQueue: batch.JobQueue;
  public readonly jobDefinition: batch.EcsJobDefinition;

  constructor(scope: Construct, id: string, props: TopicAnalysisStackProps) {
    super(scope, id, props);

    const { envName } = props.envConfig;

    this.vpc = this.createVpc();
    this.repository = this.createRepository(
      envName,
      props.githubActionsDeployRole
    );
    this.taskRole = this.createTaskRole(envName, props.bedrockInvokeModelPolicy);
    this.executionRole = this.createExecutionRole(envName);
    this.taskSecurityGroup = new ec2.SecurityGroup(this, "TaskSecurityGroup", {
      vpc: this.vpc,
      description: "topic-analysis worker job (outbound only)",
      allowAllOutbound: true,
    });

    const computeEnvironment = this.createComputeEnvironment(envName);
    this.jobQueue = new batch.JobQueue(this, "JobQueue", {
      jobQueueName: `mirai-gikai-topic-analysis-${envName}`,
      computeEnvironments: [{ computeEnvironment, order: 1 }],
    });
    this.jobDefinition = this.createJobDefinition(envName);

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
    // ジョブ自身（アプリケーションコード）が引き受けるロール。Bedrock呼び出し権限のみを持つ。
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
    // ECS/Batchエージェントが引き受けるロール（イメージpull・ログ書き込み・Secrets読み取り）。
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

  private createComputeEnvironment(
    envName: string
  ): batch.FargateComputeEnvironment {
    return new batch.FargateComputeEnvironment(this, "ComputeEnvironment", {
      computeEnvironmentName: `mirai-gikai-topic-analysis-${envName}`,
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [this.taskSecurityGroup],
      maxvCpus: COMPUTE_ENVIRONMENT_MAX_VCPUS,
    });
  }

  private createJobDefinition(envName: string): batch.EcsJobDefinition {
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

    return new batch.EcsJobDefinition(this, "JobDefinition", {
      jobDefinitionName: `mirai-gikai-topic-analysis-worker-${envName}`,
      container: new batch.EcsFargateContainerDefinition(this, "Container", {
        image: ecs.ContainerImage.fromEcrRepository(this.repository, "latest"),
        cpu: JOB_VCPUS,
        memory: cdk.Size.mebibytes(JOB_MEMORY_MIB),
        // SubmitJob呼び出し側(admin #49 / EventBridge Scheduler)のcontainerOverrides.commandで
        // 実際の--mode等を指定する前提（Cloud Run Jobの--argsと同じ構造）。
        command: DEFAULT_COMMAND,
        jobRole: this.taskRole,
        executionRole: this.executionRole,
        // Compute Environment側がパブリックサブネットのみのため、ジョブにも公開IPを割り当てる。
        assignPublicIp: true,
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: "worker", logGroup }),
        secrets: Object.fromEntries(
          Object.entries(secretsByEnvVar).map(([envVar, secret]) => [
            envVar,
            batch.Secret.fromSecretsManager(secret),
          ])
        ),
      }),
    });
  }

  private createSchedule(envName: string, schedulerEnabled: boolean): void {
    // EventBridge SchedulerがBatchにジョブを投入するためのロール。
    // AWS管理ポリシー AWSBatchServiceEventTargetRole（EventBridge→Batch用）を参考に
    // batch:SubmitJobのみを付与する。SubmitJobはJob Definition登録時に確定した
    // jobRole/executionRoleを使うため、ECS RunTaskと異なりiam:PassRoleは不要。
    const schedulerExecutionRole = new iam.Role(
      this,
      "SchedulerExecutionRole",
      {
        roleName: `mirai-gikai-topic-analysis-scheduler-${envName}`,
        description:
          "Role assumed by EventBridge Scheduler to call batch:SubmitJob",
        assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
      }
    );
    schedulerExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SubmitTopicAnalysisJob",
        effect: iam.Effect.ALLOW,
        actions: ["batch:SubmitJob"],
        resources: [this.jobQueue.jobQueueArn, this.jobDefinition.jobDefinitionArn],
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
        arn: BATCH_SUBMIT_JOB_TARGET_ARN,
        roleArn: schedulerExecutionRole.roleArn,
        // JSON.stringifyではなくtoJsonStringを使う。トークン（jobQueueArn等）を含む
        // オブジェクトを正しくFn::Joinへ解決するためのCDK標準の方法。
        //
        // キー名はPascalCase（JobName/JobQueue/JobDefinition/ContainerOverrides/Command）。
        // AWS BatchはJSON protocol（RESTではない）のAPIのため、universal targetの
        // Inputはcamel caseのSDKパラメータ名ではなくAPIモデル本来のPascalCase名を要求する
        // （実機デプロイで "missing the following field(s): JobName, JobQueue,
        // JobDefinition" のエラーにより確認済み。ECS RunTaskのcamelCaseとは別物）。
        input: cdk.Stack.of(this).toJsonString({
          JobName: `topic-analysis-analyze-all-${envName}`,
          JobQueue: this.jobQueue.jobQueueArn,
          JobDefinition: this.jobDefinition.jobDefinitionArn,
          ContainerOverrides: { Command: DEFAULT_COMMAND },
        }),
      },
    });
  }
}
