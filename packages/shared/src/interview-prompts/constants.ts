/**
 * AIインタビューのターン制御の定数。
 *
 * LLM が深掘りするか・次へ移るかを決め、コードはこの外枠（上限・予算・ステージ遷移）だけを持つ。
 * 値を変えるときはこのファイルだけを直す。
 */

/** 1セッションでAIが発話できる上限（初回・要約・確認・締めも数える） */
export const TURN_LIMIT = 20;

/** これまでのAIの発話数がこの値に達したら、次の発話から要約に入る */
export const SUMMARY_START_TURN = 17;

/** 要約・確認・締めのために残しておく発話数 */
export const SUMMARY_RESERVE_TURNS = 3;

/** 話題ごとの発話予算の既定（テンプレートで 1〜4 に上書き） */
export const DEFAULT_TURN_BUDGET = 3;

/** 発話予算の範囲 */
export const MIN_TURN_BUDGET = 1;
export const MAX_TURN_BUDGET = 4;

/** 個別の要望・テーマ外の話への対応を予算から除ける回数（話題ごと） */
export const SIDE_TURN_EXEMPT_PER_TOPIC = 1;

/** summary から chat に戻れる残りの発話数の下限 */
export const RESUME_MIN_REMAINING_TURNS = 4;

/** 再開した話題の発話予算（再開を受けた発話を含む） */
export const RESUME_TURN_BUDGET = 2;

/** 選択肢ボタンの上限（受け止めは5。「とばす」は数えない） */
export const QUICK_REPLIES_MAX = 4;
export const EVALUATION_QUICK_REPLIES_MAX = 5;

/** 必須の話題の上限（関わり・言い足しを含む。evaluate だけ6） */
export const REQUIRED_TOPICS_MAX = 5;
export const EVALUATE_REQUIRED_TOPICS_MAX = 6;

/** 個別の相談を受け付ける窓口（全体設定の既定値） */
export const DEFAULT_CONSULTATION_DESK = "市民の声窓口";

/** 初めて聞く質問の選択肢ボタンに、コードが必ず足す選択肢 */
export const SKIP_QUESTION_REPLY = "この質問はとばす";
