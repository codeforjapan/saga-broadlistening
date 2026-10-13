/**
 * インタビュープロンプト構築用の型定義（純粋関数用）
 *
 * admin (シミュレーション機能) と web の双方から利用できるよう @mirai-gikai/shared に置く。
 *
 * BillWithContent への直接依存を避けるため、プロンプトが参照する最小限のフィールドだけを
 * 持つ構造的サブセット型 PromptBillInput を定義している。BillWithContent は
 * 構造的にこの型を満たすため、既存呼び出し側はそのまま渡せる。
 */
import type { PurposeType } from "./purpose-types/types";

/**
 * 意見募集に紐づく、主たる施策以外の施策（標準難易度の内容）
 */
export type PromptRelatedPolicyInput = {
  name?: string | null;
  title?: string | null;
  summary?: string | null;
  content?: string | null;
};

/**
 * インタビュープロンプトが参照する Bill の最小構造
 */
export type PromptBillInput = {
  name?: string | null;
  knowledge_source?: string | null;
  bill_content?: {
    title?: string | null;
    summary?: string | null;
    content?: string | null;
  } | null;
  /** 同じ意見募集に紐づく他の施策。主たる施策と並べてAIに渡す */
  related_policies?: PromptRelatedPolicyInput[] | null;
} | null;

/**
 * インタビュー設定の型（純粋関数用）
 */
export type InterviewConfig = {
  /** テーマ名（interview_configs.name）。施策を持たない抽象テーマ型では対象名になる。 */
  name?: string | null;
  /** 職員が設定したテーマの説明文（interview_configs.description）。 */
  description?: string | null;
  purpose_type?: PurposeType | null;
  opinion_focus?: string | null;
  decided_matters?: string | null;
  [key: string]: unknown;
} | null;

/**
 * インタビュー質問の型（純粋関数用）
 */
export interface InterviewQuestion {
  id: string;
  question: string;
  quick_replies?: string[] | null;
  follow_up_guide?: string | null;
}

export type InterviewStage = "chat" | "summary" | "summary_complete";
export type SummaryPhase = "first" | "reply";
export type SummaryResponse = "none" | "agree" | "revise" | "resume" | "other";
