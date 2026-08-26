import { z } from "zod";
import { contentRichnessResultSchema } from "../content-richness/schemas";
import { opinionTagsShape } from "./opinion-tags-schema";

// 意見スキーマ（web のライブ生成と admin の再抽出バックフィルで共通利用）
export const opinionSchema = z
  .object({
    title: z.string().describe("意見のタイトル（40文字以内）"),
    content: z.string().describe("意見の説明（120文字以内）"),
    source_message_id: z
      .string()
      .nullable()
      .describe("この意見の根拠となるユーザー発言のメッセージID"),
    // ユーザー向けトピック分析で公開表示する文脈込み引用（§4.0）
    contextual_quote: z
      .string()
      .nullable()
      .describe(
        "source_message_id が指すユーザー発言からの逐語引用のみ。言い換え・要約・複数発言の結合・語句の補完をしない。文脈が必要な場合のみ先頭に「（○○について）」を付けてよいが、引用本体は原文ママとする。個人名などの固有名詞は含めない。適切な逐語引用が切り出せなければ null"
      ),
    // 意見単位の情報充実度（トピックカードで充実した引用を優先表示するため）
    richness: z
      .number()
      .nullable()
      .describe(
        "この意見の情報充実度を 0-100 の整数で総合評価したスコア。論点の明確さ・具体性（事例や数値）・影響への言及・提案の広がりを総合する。**content だけでなく contextual_quote（引用文）も含めて評価する**（文脈の伴う具体的な引用ほど高くする）。0=ほぼ情報がない、100=非常に充実"
      ),
    // 政務調査向け分析のタグ（懸念/提案の一覧・専門家フィルタに使う）
    ...opinionTagsShape,
  })
  .strict();

// レポート生成結果のバリデーション
export const interviewReportSchema = z
  .object({
    summary: z
      .string()
      .nullable()
      .describe(
        "ユーザーの主張を100文字程度でまとめたもの。「」書きで書けるようなテキスト（ただし「」は記載しない）"
      ),
    // 市民が最終確認・修正して提出する意見本文（opinions.final_text）。
    // summary が一覧カード向けの短い要約なのに対し、こちらが提出物の本体。
    final_text: z
      .string()
      // 空文字は NOT NULL 制約を素通りしてしまうため、スキーマ側で弾く
      .min(1)
      .describe(
        "市民が最終確認・修正したうえで提出する意見の本文。対話でユーザーが述べた内容だけを根拠に、本人の言葉遣いを活かして300文字程度でまとめる。ユーザーが手を入れずにそのまま提出できる完成した文章にする"
      ),
    role_description: z
      .string()
      .nullable()
      .describe(
        "ユーザーの役割や背景についての詳細な説明。ログ内の本人発言のみを根拠にし、根拠があれば具体的な経歴・専門性を書いてよい。ただし過去の経歴は「元〜」「〜した経験がある」のように現在の立場と誤読されない表現にする"
      ),
    role_title: z
      .string()
      .max(10)
      .nullable()
      .describe(
        "ユーザーの役割を10文字以内で端的に表現したタイトル（例: 物流業者、主婦、教師）。発言に根拠のある具体的な立場を表し、過去の職歴を現在の職業のように表記しない（過去の職歴なら「元〜」を付ける。例: 元復興関係職員）"
      ),
    opinions: z
      .array(opinionSchema)
      .max(3)
      .describe(
        "ユーザーの具体的な主張（最大3件）。議案を検討する人にとって示唆として有益な順（具体性・建設性・独自性が高い順）に並べ、先頭ほど有益・重要な主張とする。ユーザー本人の発言のみを根拠にし、インタビュアーの発言・言い換え・提示情報をユーザーの意見として記載しない。本人が明言していない要望・賛成・結論への格上げをしない。元の対話ログにないことは記載しない"
      ),
    content_richness: contentRichnessResultSchema.describe(
      "インタビューの情報充実度評価"
    ),
  })
  .strict();

export type InterviewReportData = z.infer<typeof interviewReportSchema>;

/**
 * 生成レポートから opinion_segments へ書き出す論点の形。
 * source_message_content など派生フィールドは無視する。
 */
export type InterviewOpinionSource = {
  title: string;
  content: string;
  source_message_id?: string | null;
  contextual_quote?: string | null;
  richness?: number | null;
  concern?: string | null;
  proposal?: string | null;
  reasoning_types?: readonly string[] | null;
};
