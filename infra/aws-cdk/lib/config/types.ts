export type EnvName = "dev" | "prd";

export interface EnvConfig {
  readonly envName: EnvName;
  readonly account: string;
  readonly region: string;
  readonly bedrockModelId: string;
  /**
   * トピック分析workerの定期実行（毎朝6:00 JST）を有効にするか。
   * GCP Cloud Schedulerとの二重実行を避けるため、切替時は必ずどちらか一方だけを有効にする。
   */
  readonly topicAnalysisSchedulerEnabled: boolean;
  /**
   * GitHubActionsDeployRole（GitHubOidcStack）がAssumeRoleWithWebIdentityを
   * 信頼するブランチ名とGitHub Environment名。この環境へのpush/デプロイを
   * 許可する唯一の入力元として扱う。
   */
  readonly trustedBranch: string;
  readonly trustedGithubEnvironment: string;
}
