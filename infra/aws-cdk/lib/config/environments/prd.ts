import type { EnvConfig } from "../types";

export const prdConfig: EnvConfig = {
  envName: "prd",
  account: "085350497655",
  region: "ap-northeast-1",
  bedrockModelId: "jp.anthropic.claude-sonnet-4-6",
  // AWS Batch側の定期実行を有効化（GCP Cloud Schedulerからの移行に伴う）。
  topicAnalysisSchedulerEnabled: true,
};
