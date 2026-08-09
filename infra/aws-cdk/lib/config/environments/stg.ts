import type { EnvConfig } from "../types";

// stg用のAWSアカウントがまだ発行されていないことを表すプレースホルダー。
// resolveEnvConfig() はこの値のときにエラーを投げ、誤ってこのダミーアカウントに
// デプロイしてしまうことを防ぐ。stgアカウントが決まったら実際のアカウントIDに差し替える。
export const UNCONFIGURED_ACCOUNT_ID = "000000000000";

export const stgConfig: EnvConfig = {
  envName: "stg",
  account: UNCONFIGURED_ACCOUNT_ID,
  region: "ap-northeast-1",
  bedrockModelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
};
