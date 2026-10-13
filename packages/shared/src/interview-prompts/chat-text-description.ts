// gpt-oss は構造化出力をツール呼び出しで返すため、プロンプト本文より
// 書く直前に読むこの説明のほうが効く。文の形と字数、フラグの条件をここでも念押しする
export const INTERVIEW_CHAT_TEXT_DESCRIPTION =
  "回答者に表示する本文。受け止め1文＋（必要なら短い確認）＋質問1つで、120字以内。選択肢を本文に並べない。話の途中なら質問せず続きを促してよい";

export const INTERVIEW_CHAT_FIELD_DESCRIPTIONS = {
  question_id:
    "いまの話題を続けるなら、いまの話題のID。次の話題に移るなら、次の話題のID。それ以外は入れない",
  topic_title: "その話題の短い名前",
  end_request:
    "回答者が終えたい・やめたいとはっきり言ったら true（「疲れた」だけなら false）",
  summary_response:
    "要約への返事の分類。初回の要約は none。よい=agree、直したい・付け足したい=revise、インタビューに戻りたい=resume、どれでもない=other",
} as const;
