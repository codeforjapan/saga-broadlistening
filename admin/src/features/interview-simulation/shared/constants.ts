/** シミュレーション 1 本あたりの最大ターン数（interviewer + interviewee の往復）。
 *  タイムマネジメントの動的更新で自然に要約遷移するのが理想で、これは安全弁。 */
export const SIMULATION_MAX_TURNS = 20;

/** 複数ペルソナ並列シミュで一度に実行できるスロット数の上限（コスト・レート制限観点） */
export const MAX_PERSONA_SLOTS = 10;

/** UI 上で推奨する上限。これを超えると警告を出す想定 */
export const RECOMMENDED_PERSONA_SLOTS = 6;

export const ENV_DEFAULT_MODEL = "__default__";

/** インタビュアー側のデフォルトモデル（環境設定から解決） */
export const DEFAULT_INTERVIEWER_MODEL = ENV_DEFAULT_MODEL;

/** インタビュイー（ペルソナ）側のデフォルトモデル */
export const DEFAULT_INTERVIEWEE_MODEL = ENV_DEFAULT_MODEL;

/** ペルソナ抽出のデフォルトモデル */
export const DEFAULT_PERSONA_MODEL = ENV_DEFAULT_MODEL;

/** AI Judge のデフォルトモデル */
export const DEFAULT_JUDGE_MODEL = ENV_DEFAULT_MODEL;

/** 比較対象のプロンプト種別 */
export const PROMPT_KIND = {
  current: "current",
  improved: "improved",
} as const;

export type PromptKind = (typeof PROMPT_KIND)[keyof typeof PROMPT_KIND];

/**
 * LLM 個別呼び出しのタイムアウト (ms)。
 * 呼び出し種別ごとに、処理重さに応じた ceiling を設定する。
 * タイムアウト時は withTimeoutRetry 側で LLM_MAX_ATTEMPTS 回までリトライする。
 */
export const LLM_TIMEOUT_MS = {
  /** インタビュアー / インタビュイーの 1 ターン生成。短文だが knowledge source を含む長文プロンプトに耐える余裕を持たせる */
  interviewTurn: 40_000,
  /** Summary フェーズのレポート生成（transcript 全体を読むのでやや長め） */
  summary: 60_000,
  /** ペルソナ生成（report 抽出 / bill 生成とも）。推論量が多め */
  persona: 120_000,
  /** 満足度評価（transcript 全体を読む） */
  satisfaction: 90_000,
  /** 総合評価（全ペルソナの情報を横断） */
  overallEvaluation: 120_000,
} as const;

/** LLM 呼び出しの最大試行回数（1 = リトライなし、2 = 1 回リトライ） */
export const LLM_MAX_ATTEMPTS = 2;
