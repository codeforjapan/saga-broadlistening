/**
 * Langfuse Cloud の既定エンドポイント。
 *
 * 日本リージョンを既定にしているのはデータ所在の要件による。トレースには
 * プロンプトと応答の全文、つまり市民から寄せられた意見そのものが乗る。
 * 本システムは推論を国内に限定しており（Bedrock は `jp.` 推論プロファイル固定、
 * IAM 側でも global な推論プロファイルとクロスリージョンルーティングを Deny）、
 * 可観測性基盤だけ国外へ送ると、その制限が抜け道から崩れる。
 *
 * Langfuse SDK 自体の既定値は EU（`https://cloud.langfuse.com`）なので、
 * baseUrl を渡し忘れると黙って国外へ出る。`resolveLangfuseBaseUrl()` を
 * Langfuse へ接続するすべての生成点で通すこと。
 */
export const LANGFUSE_DEFAULT_BASE_URL = "https://jp.cloud.langfuse.com";

/**
 * 設定値が未指定・空文字・空白のみなら日本リージョンへ倒す。
 * 明示された値はそのまま使う（セルフホストを妨げないため）。
 */
export function resolveLangfuseBaseUrl(configured?: string): string {
  return configured?.trim() || LANGFUSE_DEFAULT_BASE_URL;
}

export interface LangfuseConnectionConfig {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  environment?: string;
}

/**
 * LangfuseSpanProcessor に渡す設定を組み立てる。
 *
 * baseUrl の解決を spread のあとに置くことが要件で、順序が入れ替わると
 * 未設定時に SDK 既定の EU へ黙って送られる。純粋関数にしてテストで固定する。
 * v4 ingestion ヘッダーが無いと Langfuse 側の反映が最大15分遅延する。
 */
export function buildLangfuseProcessorOptions(
  config: LangfuseConnectionConfig
) {
  return {
    ...config,
    baseUrl: resolveLangfuseBaseUrl(config.baseUrl),
    additionalHeaders: { "x-langfuse-ingestion-version": "4" },
  };
}
