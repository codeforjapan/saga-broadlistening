import type { EnvConfig } from "../types";

export const devConfig: EnvConfig = {
  envName: "dev",
  account: "826784631888",
  region: "ap-northeast-1",
  bedrockModelId: "jp.anthropic.claude-sonnet-4-6",
  // dev環境では定期実行させない（動作確認はSubmitJobの手動起動で行う）。
  topicAnalysisSchedulerEnabled: false,
};
