import {
  type VoiceSummaryValidation,
  validateVoiceSummaryMarkdown,
} from "@mirai-gikai/shared/voice-summary/markdown";
import type { PublicTopic } from "../public/public-types";

/**
 * みんなの声のまとめ（Markdown）の生成（Epic #162 / #160）。
 *
 * 公開中のトピック分析（タイトル・要約・件数・代表的な意見）を入力に、8つの記法だけを使った
 * Markdown を書かせる。生成結果が記法の検証に通らなければ、エラー内容を付けて1回だけ書き直させる。
 * LLM の呼び出しは generate として注入する（テストでは Fake に差し替える）。
 */

/** 1トピックあたりに入れる代表的な意見の数 */
const QUOTES_PER_TOPIC = 3;

/** トピックを件数の多い順に並べる（プロンプトの入力と「もとになったトピック」で同じ順にする） */
export function sortTopicsByOpinionCount<T extends { opinion_count: number }>(
  topics: T[]
): T[] {
  return [...topics].sort((a, b) => b.opinion_count - a.opinion_count);
}

/** トピック分析をプロンプトの {{topicsText}} に入れる文字列にする（件数の多い順） */
export function buildVoiceSummaryTopicsText(topics: PublicTopic[]): string {
  return sortTopicsByOpinionCount(topics)
    .map((topic, index) => {
      const quotes = [...topic.opinions]
        .sort((a, b) => (b.richness ?? -1) - (a.richness ?? -1))
        .slice(0, QUOTES_PER_TOPIC)
        .map((opinion) => `  - 「${opinion.contextual_quote ?? opinion.content}」`);
      return [
        `### トピック${index + 1}: ${topic.title}（${topic.opinion_count}件）`,
        `要約: ${topic.description}`,
        quotes.length > 0 ? `代表的な意見:\n${quotes.join("\n")}` : null,
      ]
        .filter((line) => line !== null)
        .join("\n");
    })
    .join("\n\n");
}

export type VoiceSummaryMessage = {
  role: "user" | "assistant";
  content: string;
};

/** LLM に system と会話を渡し、本文（テキスト）を返す */
export type GenerateMarkdownFn = (params: {
  system: string;
  messages: VoiceSummaryMessage[];
}) => Promise<string>;

export class VoiceSummaryGenerationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`生成したまとめが記法のルールを満たしませんでした: ${errors.join(" / ")}`);
    this.name = "VoiceSummaryGenerationError";
  }
}

const FIRST_REQUEST = "上の指示に従って、みんなの声のまとめを書いてください。";

/** モデルが ```markdown で囲んで返したときに外す */
export function stripCodeFence(text: string): string {
  const match = text.trim().match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/);
  return (match ? match[1] : text).trim();
}

export async function generateVoiceSummary(params: {
  /** 変数（テーマ名・トピック）を埋めたシステムプロンプト */
  systemPrompt: string;
  generate: GenerateMarkdownFn;
  validate?: (markdown: string) => VoiceSummaryValidation;
}): Promise<{ markdown: string; attempts: number }> {
  const validate = params.validate ?? validateVoiceSummaryMarkdown;
  const messages: VoiceSummaryMessage[] = [
    { role: "user", content: FIRST_REQUEST },
  ];

  const first = stripCodeFence(
    await params.generate({ system: params.systemPrompt, messages })
  );
  const firstResult = validate(first);
  if (firstResult.ok) {
    return { markdown: first, attempts: 1 };
  }

  // 記法の違反を伝えて、1回だけ全文を書き直させる
  const second = stripCodeFence(
    await params.generate({
      system: params.systemPrompt,
      messages: [
        ...messages,
        { role: "assistant", content: first },
        {
          role: "user",
          content: `前回の出力は記法のルールに違反していました。\n${firstResult.errors.map((error) => `- ${error}`).join("\n")}\nルールを守って、全文を書き直してください。`,
        },
      ],
    })
  );
  const secondResult = validate(second);
  if (!secondResult.ok) {
    throw new VoiceSummaryGenerationError(secondResult.errors);
  }
  return { markdown: second, attempts: 2 };
}
