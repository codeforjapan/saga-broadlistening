/** インタビューの目的（内部の5型） */
export const PURPOSE_TYPES = [
  "understand",
  "discover",
  "verify",
  "evaluate",
  "envision",
] as const;
export type PurposeType = (typeof PURPOSE_TYPES)[number];

/** 対象。施策に紐づくか（bill）、テーマだけか（theme） */
export type InterviewSubjectKind = "bill" | "theme";

/** テンプレートの1話題 */
export interface PurposeTemplateStep {
  /** 聞けたら豊かになる観点。満たすべき条件ではない */
  follow_up_guide: string | null;
  question: string;
  quick_replies: string[];
}

/** 対象ごとに変わるプロンプトの断片 */
export interface PurposeSubjectVariant {
  /** 型の聞き方（聞き方の原則の最後に足す） */
  perspectiveTechniques: string;
  /** 返し方の良い例 */
  replyExamples: string;
  steps: PurposeTemplateStep[];
}

export interface PurposeTypeDefinition {
  type: PurposeType;
  /** 内部の型名（わかる・見つける…） */
  label: string;
  /** 聞き方の焦点 */
  focusInstruction: string;
  bill: PurposeSubjectVariant;
  theme: PurposeSubjectVariant;
}
