import type { EnvConfig } from "../types";

export const prdConfig: EnvConfig = {
  envName: "prd",
  account: "085350497655",
  region: "ap-northeast-1",
  bedrockModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  // 既定は無効。GCP Cloud Scheduler（infra/cloud-run）との二重実行を防ぐため、
  // 切替時はCloud Scheduler側をSCHEDULER_PAUSED=1にしてからtrueに変更してデプロイすること。
  topicAnalysisSchedulerEnabled: false,
};
