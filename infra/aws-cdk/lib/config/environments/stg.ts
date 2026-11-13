import type { EnvConfig } from "../types";

export const stgConfig: EnvConfig = {
  envName: "stg",
  account: "826784631888",
  region: "ap-northeast-1",
  bedrockModelId: "jp.anthropic.claude-sonnet-4-6",
  // stg環境では定期実行させない（動作確認はSubmitJobの手動起動で行う）。
  topicAnalysisSchedulerEnabled: false,
  // develop環境はAWSアカウントをstgと共用するため、developブランチ/staging Environmentからの
  // デプロイもこのstg環境のロールを信頼する。
  trustedBranch: "develop",
  trustedGithubEnvironment: "staging",
};
