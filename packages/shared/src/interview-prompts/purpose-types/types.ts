/** インタビューの目的（内部の5型） */
export const PURPOSE_TYPES = [
  "understand",
  "discover",
  "verify",
  "evaluate",
  "envision",
] as const;
export type PurposeType = (typeof PURPOSE_TYPES)[number];

/** 話題の種類。制御には使わず、プロンプトの表示と要約で使う */
export const STEP_KINDS = [
  "fact",
  "episode",
  "reason",
  "evaluation",
  "add_more",
] as const;
export type StepKind = (typeof STEP_KINDS)[number];

/** 対象。施策に紐づくか（bill）、テーマだけか（theme） */
export type InterviewSubjectKind = "bill" | "theme";

/** テンプレートの1話題 */
export interface PurposeTemplateStep {
  step_key: string;
  /** 話題の短い名前（プロンプトの「いまの話題」や初回の全体像に使う） */
  title: string;
  step_kind: StepKind;
  turn_budget: number;
  required: boolean;
  /** 聞けたら豊かになる観点。満たすべき条件ではない */
  hint: string | null;
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

export const STEP_KIND_LABELS: Record<StepKind, string> = {
  fact: "事実",
  episode: "場面",
  reason: "理由",
  evaluation: "受け止め",
  add_more: "言い足し",
};
