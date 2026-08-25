/**
 * ペルソナ／意見のスタンス
 *
 * Epic #54 で opinions からは stance カラムが廃止されたため、
 * 現在はインタビューシミュレーションのペルソナ表示にのみ使う。
 */
export const interviewReportStances = ["for", "against", "neutral"] as const;

export type InterviewReportStance = (typeof interviewReportStances)[number];

/**
 * スタンスのラベルマッピング
 */
export const stanceLabels: Record<InterviewReportStance, string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
};
