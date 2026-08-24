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

  it("タスク定義がcpu 1024・memory 2048で、既定コマンドがanalyze-allのworkerコンテナを持つ", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test4",
      "dev"
    );

    const template = Template.fromStack(topicAnalysisStack);

    template.hasResourceProperties("AWS::ECS::TaskDefinition", {
      Family: `mirai-gikai-topic-analysis-worker-${envConfig.envName}`,
      Cpu: "1024",
      Memory: "2048",
      RequiresCompatibilities: ["FARGATE"],
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Name: "worker",
          Command: ["--mode=analyze-all"],
          Secrets: Match.arrayWith([
            Match.objectLike({ Name: "SUPABASE_URL" }),
            Match.objectLike({ Name: "SUPABASE_SECRET_KEY" }),
            Match.objectLike({ Name: "AI_GATEWAY_API_KEY" }),
          ]),
        }),
      ]),
    });
  });

  it("EventBridge Schedulerのcron式・タイムゾーン・ターゲットが正しい", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test5",
      "dev"
    );

    const template = Template.fromStack(topicAnalysisStack);

    template.hasResourceProperties("AWS::Scheduler::Schedule", {
      ScheduleExpression: "cron(0 6 * * ? *)",
      ScheduleExpressionTimezone: "Asia/Tokyo",
      State: "DISABLED",
      Target: Match.objectLike({
        EcsParameters: Match.objectLike({
          LaunchType: "FARGATE",
          NetworkConfiguration: {
            AwsvpcConfiguration: Match.objectLike({
              AssignPublicIp: "ENABLED",
            }),
          },
        }),
        Input: JSON.stringify({
          containerOverrides: [
            { name: "worker", command: ["--mode=analyze-all"] },
          ],
        }),
      }),
    });
    expect(envConfig.topicAnalysisSchedulerEnabled).toBe(false);
  });

  it("EventBridge Schedulerロールのecs:RunTaskとiam:PassRoleがワイルドカードでない", () => {
    const { topicAnalysisStack } = createTestTopicAnalysisStack("Test6", "dev");

    const template = Template.fromStack(topicAnalysisStack);

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "RunTopicAnalysisTask",
            Effect: "Allow",
            Action: "ecs:RunTask",
            Resource: Match.not(Match.arrayWith(["*"])),
            Condition: {
              ArnEquals: Match.objectLike({
                "ecs:cluster": Match.anyValue(),
              }),
            },
          }),
        ]),
      },
    });
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: "PassTaskRoles",
            Effect: "Allow",
            Action: "iam:PassRole",
            Resource: Match.not("*"),
            Condition: {
              StringEquals: {
                "iam:PassedToService": "ecs-tasks.amazonaws.com",
              },
            },
          }),
        ]),
      },
    });
  });

  it("prd環境ではEventBridge Schedulerの既定値も無効(DISABLED)のままにする", () => {
    const { topicAnalysisStack, envConfig } = createTestTopicAnalysisStack(
      "Test7",
      "prd"
    );

    const template = Template.fromStack(topicAnalysisStack);

    expect(envConfig.topicAnalysisSchedulerEnabled).toBe(false);
    template.hasResourceProperties("AWS::Scheduler::Schedule", {
      State: "DISABLED",
    });
  });
});
