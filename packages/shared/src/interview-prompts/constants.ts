/**
 * AIインタビューの目的別テンプレートとターン制御の定数。
 *
 * LLM が深掘りするか・次へ移るかを決め、コードはこの外枠（上限・ステージ遷移）だけを持つ。
 * 値を変えるときはこのファイルだけを直す。
 */

/**
 * 質問1つあたりの、質問の発話の目安。十分に聞けていなければ、AIはこれを超えて深掘りしてよい
 * （ただし最後の話題は次へ移れないので、これが上限）。
 * chat ステージのAIの発話を数え、最初の発話（あいさつと最初の質問）と
 * 要約の段階の発話は数えない
 */
export const QUESTION_TURNS_PER_TOPIC = 5;

/**
 * セッション全体の質問の発話の上限を決める、質問1つあたりの回数。
 * 全体の上限は「質問の数 × これ」。上限に達したら、次の発話から要約に入る
 */
export const QUESTION_TURN_LIMIT_PER_TOPIC = 10;

/** 要約の段階でAIが発話できる上限（初回の要約・確認・締め・再開を受ける発話。再開後も通算） */
export const SUMMARY_TURN_LIMIT = 5;

/**
 * summary から chat に戻れる、要約の段階の残りの発話数の下限
 * （再開を受ける発話・もう一度の要約・締めの3回）
 */
export const RESUME_MIN_SUMMARY_TURNS = 3;

/** 再開した話題の発話の上限（再開を受けた発話を含む） */
export const RESUME_TOPIC_TURN_LIMIT = 2;

/** 選択肢ボタンの上限（受け止めは「まだ決められない」を含めて5。「とばす」は数えない） */
export const QUICK_REPLIES_MAX = 4;
export const EVALUATION_QUICK_REPLIES_MAX = 5;

/** テンプレートの話題の上限（関わり・言い足しを含む。evaluate だけ6） */
export const TEMPLATE_TOPICS_MAX = 5;
export const EVALUATE_TEMPLATE_TOPICS_MAX = 6;

/** 初めて聞く質問の選択肢ボタンに、コードが必ず足す選択肢 */
export const SKIP_QUESTION_REPLY = "この質問はとばす";

/** いただいた声の扱い（対話・要約の締めで共通。時期や場所は約束しない） */
export const VOICE_USAGE_TEXT = "いただいた声は、市の施策に役立てます";

/** 個別の相談・要望に応えられないことの伝え方 */
export const NO_INDIVIDUAL_RESPONSE_TEXT =
  "個別のご相談やご要望には、このインタビューではお応えできません";

/** プロンプトに載せる、主たる施策以外の施策の上限（紐づけの順に先頭から） */
export const MAX_RELATED_POLICIES = 5;

/** 主たる施策以外の施策の本文の上限（文字数）。超えた分は省く */
export const RELATED_POLICY_CONTENT_MAX_CHARS = 2000;
