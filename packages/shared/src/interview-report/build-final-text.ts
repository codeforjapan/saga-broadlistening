type FinalTextSource = {
  summary: string;
  opinions: ReadonlyArray<{ title: string; content: string }>;
};

/**
 * 提出する意見の本文（opinions.final_text）を、見出しとトピックから組み立てる。
 *
 * 見出しの下にトピックを番号付きで並べる。トピックが無ければ見出しだけになる。
 * AI に別の本文を書かせると見出し・トピックと中身が重なるため、コードで決める。
 */
export function buildFinalText({ summary, opinions }: FinalTextSource): string {
  const topics = opinions
    .map((opinion) =>
      [opinion.title.trim(), opinion.content.trim()].filter(Boolean).join("\n")
    )
    .filter(Boolean)
    .map((topic, index) => `${index + 1}. ${topic}`);
  return [summary.trim(), ...topics].join("\n\n");
}
