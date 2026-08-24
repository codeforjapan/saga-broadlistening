import type { EnvConfig } from "../types";

export const devConfig: EnvConfig = {
  envName: "dev",
  account: "826784631888",
  region: "ap-northeast-1",
  bedrockModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  // dev環境では定期実行させない（動作確認はRunTaskの手動起動で行う）。
  topicAnalysisSchedulerEnabled: false,
};
