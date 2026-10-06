import type { Database } from "@mirai-gikai/supabase";

/** インタビューの参加条件（DB の enum に対応） */
export type InterviewParticipationMode =
  Database["public"]["Enums"]["interview_participation_mode_enum"];

/** z.enum() に渡せるタプル。DB の enum とずれたら型エラーになる */
export const VALID_PARTICIPATION_MODES = [
  "public",
  "external_identity",
] as const satisfies readonly InterviewParticipationMode[];

/** 新規作成時の既定値。既定で回答が開放されるため、admin では必須項目として明示する */
export const DEFAULT_PARTICIPATION_MODE: InterviewParticipationMode = "public";

export const PARTICIPATION_MODE_LABELS: Record<
  InterviewParticipationMode,
  string
> = {
  public: "誰でも回答できる",
  external_identity: "外部アプリの利用者のみ",
};

export const PARTICIPATION_MODE_DESCRIPTIONS: Record<
  InterviewParticipationMode,
  string
> = {
  public: "通常のブラウザからも回答できます（公開募集・イベント・デモ向け）",
  external_identity:
    "選んだ連携元のアプリから開いた利用者だけが回答できます。通常のブラウザでは回答方法の案内を表示します",
};

/** テーマの参加条件（interview_configs の該当列） */
export type InterviewParticipationRule = {
  participation_mode: InterviewParticipationMode;
  allowed_provider_keys: string[];
};

/**
 * 利用者がテーマに回答できるかを判定する。
 *
 * - public はだれでも回答できる
 * - external_identity は、利用者に紐付いた外部IDの連携元が許可一覧に含まれるときだけ回答できる
 *
 * ブラウザの種類ではなく、参加条件と外部IDの紐付け状況だけで決める。
 * 会話の所有者判定（user_id）とは別の判定で、ここでは扱わない。
 */
export function canParticipateInInterview(params: {
  rule: InterviewParticipationRule;
  /** 利用者に紐付いている外部IDの連携元キー一覧 */
  linkedProviderKeys: readonly string[];
}): boolean {
  const { rule, linkedProviderKeys } = params;
  switch (rule.participation_mode) {
    case "public":
      return true;
    case "external_identity":
      return rule.allowed_provider_keys.some((key) =>
        linkedProviderKeys.includes(key)
      );
    default: {
      const _exhaustive: never = rule.participation_mode;
      return _exhaustive;
    }
  }
}
