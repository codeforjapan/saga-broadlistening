/**
 * AIインタビューの目的別テンプレートの定数。
 * 値を変えるときはこのファイルだけを直す。
 */

/** 選択肢ボタンの上限（受け止めは「まだ決められない」を含めて5。「とばす」は数えない） */
export const QUICK_REPLIES_MAX = 4;
export const EVALUATION_QUICK_REPLIES_MAX = 5;

/** テンプレートの話題の上限（関わり・言い足しを含む。evaluate だけ6） */
export const TEMPLATE_TOPICS_MAX = 5;
export const EVALUATE_TEMPLATE_TOPICS_MAX = 6;
