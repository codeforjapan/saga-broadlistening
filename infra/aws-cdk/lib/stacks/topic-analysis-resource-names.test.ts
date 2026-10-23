import { describe, expect, it } from "vitest";
import {
  buildSubmitTopicAnalysisJobResourceArns,
  buildTopicAnalysisJobDefinitionArn,
  topicAnalysisJobDefinitionName,
  topicAnalysisJobQueueName,
} from "./topic-analysis-resource-names";

const base = {
  partition: "aws",
  region: "ap-northeast-1",
  account: "123456789012",
};

describe("topicAnalysisJobQueueName", () => {
  it("環境名を含むJob Queue名を返す", () => {
    expect(topicAnalysisJobQueueName("stg")).toBe(
      "mirai-gikai-topic-analysis-stg"
    );
  });
});

describe("topicAnalysisJobDefinitionName", () => {
  it("環境名を含むJob Definition名を返す", () => {
    expect(topicAnalysisJobDefinitionName("prd")).toBe(
      "mirai-gikai-topic-analysis-worker-prd"
    );
  });
});

describe("buildTopicAnalysisJobDefinitionArn", () => {
  it("リビジョン番号を含まないJob Definition ARNを返す", () => {
    expect(
      buildTopicAnalysisJobDefinitionArn({ ...base, envName: "stg" })
    ).toBe(
      "arn:aws:batch:ap-northeast-1:123456789012:job-definition/mirai-gikai-topic-analysis-worker-stg"
    );
  });
});

describe("buildSubmitTopicAnalysisJobResourceArns", () => {
  it("Job Queue ARNと、リビジョンを問わないJob Definition ARNを返す", () => {
    const arns = buildSubmitTopicAnalysisJobResourceArns({
      ...base,
      envName: "stg",
    });

    expect(arns).toEqual([
      "arn:aws:batch:ap-northeast-1:123456789012:job-queue/mirai-gikai-topic-analysis-stg",
      "arn:aws:batch:ap-northeast-1:123456789012:job-definition/mirai-gikai-topic-analysis-worker-stg",
      "arn:aws:batch:ap-northeast-1:123456789012:job-definition/mirai-gikai-topic-analysis-worker-stg:*",
    ]);
  });
});
