/**
 * 環境変数の設定
 * アプリケーション全体で使用する環境変数を一元管理
 */

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "環境変数 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が設定されていません"
  );
}

export const env = {
  adminUrl: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.ADMIN_URL || "http://localhost:3001",
  webUrl: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  revalidateSecret: process.env.REVALIDATE_SECRET,
  // トピック分析・バックフィルを実行する Cloud Run Job のトリガ設定
  gcp: {
    projectId: process.env.GCP_PROJECT_ID,
    region: process.env.GCP_REGION || "asia-northeast1",
    topicAnalysisJob: process.env.GCP_TOPIC_ANALYSIS_JOB,
    // サービスアカウント鍵（JSON 文字列）。Vercel では1つの環境変数に丸ごと格納する。
    serviceAccountKey: process.env.GCP_SA_KEY,
  },
  langfuse: {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
  },
  // /api/tests/* を管理者ログイン無しでcurl等から叩くための共有シークレット。
  // @/lib/require-secret-header 参照。
  apiTestSecretToken: process.env.API_TEST_SECRET_TOKEN,
  // Vercel OIDC Federation経由でAWS（Bedrock呼び出し・トピック分析workerのBatch起動）を
  // 呼ぶための設定。roleArnが未設定の場合はローカル開発とみなし ~/.aws の資格情報を使う
  // （@/lib/aws-credentials 参照）。
  aws: {
    region: process.env.AWS_REGION || "ap-northeast-1",
    roleArn: process.env.AWS_ROLE_ARN,
    topicAnalysisBatchJobQueueArn:
      process.env.TOPIC_ANALYSIS_BATCH_JOB_QUEUE_ARN,
    topicAnalysisBatchJobDefinitionArn:
      process.env.TOPIC_ANALYSIS_BATCH_JOB_DEFINITION_ARN,
  },
} as const;

// 型定義
export type Env = typeof env;
