/**
 * 保存済みの要約メッセージの report を、今の形にそろえる純粋関数。
 * 要約の形が変わっても、旧メッセージの表示・抽出（インタビュー完了）が壊れないようにする。
 *
 * - AI が書いていた final_text（提出本文）がある → 今はコードで組み立てるので落とす。
 *   見出し（summary）が無ければ、代わりにその本文を見出しにする
 * - opinions に contextual_quote / richness / concern / proposal /
 *   reasoning_types が無い → null で補う（§4.0）
 *
 * report がオブジェクトでなければ、そのまま返す。
 */
export function normalizeLegacyReport(rawReport: unknown): unknown {
  if (!rawReport || typeof rawReport !== "object" || Array.isArray(rawReport)) {
    return rawReport;
  }

  const { final_text: legacyFinalText, ...report } = rawReport as Record<
    string,
    unknown
  >;
  if (!report.summary && typeof legacyFinalText === "string") {
    report.summary = legacyFinalText;
  }
  if (Array.isArray(report.opinions)) {
    report.opinions = report.opinions.map((opinion) =>
      opinion && typeof opinion === "object"
        ? {
            contextual_quote: null,
            richness: null,
            concern: null,
            proposal: null,
            reasoning_types: null,
            ...opinion,
          }
        : opinion
    );
  }
  return report;
}
