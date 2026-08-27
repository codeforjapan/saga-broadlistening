import type { EnvConfig } from "../types";

// stg用のAWSアカウントがまだ発行されていないことを表すプレースホルダー。
// resolveEnvConfig() はこの値のときにエラーを投げ、誤ってこのダミーアカウントに
// デプロイしてしまうことを防ぐ。stgアカウントが決まったら実際のアカウントIDに差し替える。
export const UNCONFIGURED_ACCOUNT_ID = "000000000000";

export const stgConfig: EnvConfig = {
  envName: "stg",
  account: UNCONFIGURED_ACCOUNT_ID,
  region: "ap-northeast-1",
  bedrockModelId: "jp.anthropic.claude-sonnet-4-6",
  // stgアカウント未設定のため無効。GCP Cloud Schedulerと二重稼働させないよう、
  // stgアカウントを設定して有効化する際はGCP側のSCHEDULER_PAUSEDを1にすること。
  topicAnalysisSchedulerEnabled: false,
};
