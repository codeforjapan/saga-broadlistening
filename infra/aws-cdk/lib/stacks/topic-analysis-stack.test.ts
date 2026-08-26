import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { createTestTopicAnalysisStack } from "./test-support";

describe("TopicAnalysisStack", () => {
  it("NAT Gatewayを作らずパブリックサブネットのみのVPCを構成する", () => {
    const { topicAnalysisStack } = createTestTopicAnalysisStack("Test1", "dev");

    const template = Template.fromStack(topicAnalysisStack);

    template.resourceCountIs("AWS::EC2::NatGateway", 0);
    template.hasResourceProperties("AWS::EC2::Subnet", {
      MapPublicIpOnLaunch: true,
    });
  });

  it("ECRリポジトリをイメージスキャン有効・ライフサイクルルール付きで作成する", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test2",
      "dev"
    );

    const template = Template.fromStack(topicAnalysisStack);

    template.hasResourceProperties("AWS::ECR::Repository", {
      RepositoryName: `mirai-gikai-topic-analysis-worker-${envConfig.envName}`,
      ImageScanningConfiguration: { ScanOnPush: true },
      LifecyclePolicy: Match.objectLike({}),
    });
  });

  it("ECRリポジトリのリソースポリシーでGitHub Actionsのpushを許可する", () => {
    const { topicAnalysisStack } = createTestTopicAnalysisStack("Test2b", "dev");

    const template = Template.fromStack(topicAnalysisStack);

    template.hasResourceProperties("AWS::ECR::Repository", {
      RepositoryPolicyText: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "AllowGitHubActionsPush",
            Effect: "Allow",
            Action: Match.arrayWith(["ecr:PutImage"]),
          }),
        ]),
      }),
    });
  });

  it("タスクロールにBedrock呼び出しポリシーをアタッチする", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test3",
      "dev"
    );

    const template = Template.fromStack(topicAnalysisStack);

    const role = template.findResources("AWS::IAM::Role", {
      Properties: {
        RoleName: `mirai-gikai-topic-analysis-task-${envConfig.envName}`,
      },
    });
    const [taskRole] = Object.values(role);
    expect(taskRole.Properties.AssumeRolePolicyDocument.Statement).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Effect: "Allow",
          Principal: { Service: "ecs-tasks.amazonaws.com" },
        }),
      ])
    );
    expect(taskRole.Properties.ManagedPolicyArns).toHaveLength(1);
  });

  it("Compute EnvironmentがNATなしのパブリックサブネットでFargate構成になっている", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test4",
      "dev"
    );

    const template = Template.fromStack(topicAnalysisStack);

    template.hasResourceProperties("AWS::Batch::ComputeEnvironment", {
      ComputeEnvironmentName: `mirai-gikai-topic-analysis-${envConfig.envName}`,
      Type: "managed",
      ComputeResources: Match.objectLike({
        Type: "FARGATE",
        MaxvCpus: 4,
      }),
    });
  });

  it("Job Queueが唯一のCompute Environmentに紐づく", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test5",
      "dev"
    );

    const template = Template.fromStack(topicAnalysisStack);

    template.hasResourceProperties("AWS::Batch::JobQueue", {
      JobQueueName: `mirai-gikai-topic-analysis-${envConfig.envName}`,
      ComputeEnvironmentOrder: Match.arrayWith([
        Match.objectLike({ Order: 1 }),
      ]),
    });
  });

  it("Job Definitionがvcpu1・memory2048で、既定コマンドがanalyze-allのコンテナを持つ", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test6",
      "dev"
    );

    const template = Template.fromStack(topicAnalysisStack);

    template.hasResourceProperties("AWS::Batch::JobDefinition", {
      JobDefinitionName: `mirai-gikai-topic-analysis-worker-${envConfig.envName}`,
      PlatformCapabilities: ["FARGATE"],
      ContainerProperties: Match.objectLike({
        Command: ["--mode=analyze-all"],
        NetworkConfiguration: { AssignPublicIp: "ENABLED" },
        ResourceRequirements: Match.arrayWith([
          Match.objectLike({ Type: "MEMORY", Value: "2048" }),
          Match.objectLike({ Type: "VCPU", Value: "1" }),
        ]),
        Secrets: Match.arrayWith([
          Match.objectLike({ Name: "SUPABASE_URL" }),
          Match.objectLike({ Name: "SUPABASE_SECRET_KEY" }),
          Match.objectLike({ Name: "AI_GATEWAY_API_KEY" }),
        ]),
      }),
    });
  });

  it("EventBridge Schedulerのcron式・タイムゾーン・Batch SubmitJobターゲットが正しい", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test7",
      "dev"
    );

    const template = Template.fromStack(topicAnalysisStack);

    // InputはjobQueue/jobDefinitionのARNをトークンとして含むためFn::Joinに
    // なる。固定文字列部分だけを正規表現で照合する（jobQueue/jobDefinitionの
    // ARN自体はFn::GetAtt/Refとして別要素になるため、ここでは照合しない）。
    // キー名はPascalCase（実機デプロイでcamelCaseだと拒否されることを確認済み）。
    template.hasResourceProperties("AWS::Scheduler::Schedule", {
      ScheduleExpression: "cron(0 6 * * ? *)",
      ScheduleExpressionTimezone: "Asia/Tokyo",
      State: "DISABLED",
      Target: Match.objectLike({
        Arn: "arn:aws:scheduler:::aws-sdk:batch:submitJob",
        Input: {
          "Fn::Join": [
            "",
            Match.arrayWith([
              Match.stringLikeRegexp(
                `"JobName":"topic-analysis-analyze-all-${envConfig.envName}"`
              ),
              Match.stringLikeRegexp(
                String.raw`"ContainerOverrides":\{"Command":\["--mode=analyze-all"\]\}\}`
              ),
            ]),
          ],
        },
      }),
    });
    expect(envConfig.topicAnalysisSchedulerEnabled).toBe(false);
  });

  it("EventBridge Schedulerロールのbatch:SubmitJobがワイルドカードでなくJobQueue/JobDefinitionに限定される", () => {
    const { topicAnalysisStack } = createTestTopicAnalysisStack("Test8", "dev");

    const template = Template.fromStack(topicAnalysisStack);

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "SubmitTopicAnalysisJob",
            Effect: "Allow",
            Action: "batch:SubmitJob",
            Resource: Match.not(Match.arrayWith(["*"])),
          }),
        ]),
      },
    });
  });

  it("Job Queue/Job Definition ARNをCfnOutputとして出力する", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test10",
      "dev"
    );

    const template = Template.fromStack(topicAnalysisStack);

    template.hasOutput("JobQueueArnOutput", {
      Export: {
        Name: `MiraiGikaiTopicAnalysisJobQueueArn-${envConfig.envName}`,
      },
    });
    template.hasOutput("JobDefinitionArnOutput", {
      Export: {
        Name: `MiraiGikaiTopicAnalysisJobDefinitionArn-${envConfig.envName}`,
      },
    });
  });

  it("prd環境ではEventBridge Schedulerの既定値も無効(DISABLED)のままにする", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test9",
      "prd"
    );

    const template = Template.fromStack(topicAnalysisStack);

    expect(envConfig.topicAnalysisSchedulerEnabled).toBe(false);
    template.hasResourceProperties("AWS::Scheduler::Schedule", {
      State: "DISABLED",
    });
  });
});
