// gpt-oss は構造化出力をツール呼び出しで返すため、プロンプト本文より
// 書く直前に読むこの説明のほうが効く。1ターン1問をここでも念押しする
export const INTERVIEW_CHAT_TEXT_DESCRIPTION =
  "利用者に見せる返答。直前の回答があれば受け止めの1〜2文を先に書く。質問は1つだけにし、「？」は1回までにする";

export const INTERVIEW_CHAT_FIELD_DESCRIPTIONS = {
  question_id:
    "いまの話題を続けるなら、いまの話題のID。次の話題に移るなら、移った話題（次に聞ける話題から選んだもの）のID。それ以外は入れない",
  topic_title: "その話題の短い名前",
  end_request:
    "回答者が終えたい・やめたいとはっきり言ったら true（「疲れた」だけなら false）",
  wrap_up:
    "次に聞ける話題がない最後の話題で、回答者が「ない」「特にない」と答えた、または十分に聞けたら true。それ以外は false",
} as const;
