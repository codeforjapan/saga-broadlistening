import { renderPromptTemplate } from "../prompts/template";
import {
  INTERVIEW_INITIAL_TEMPLATE,
  INTERVIEW_PERSONA_TEMPLATE,
} from "./templates";
import type { TurnTopic } from "./turn-control";

/**
 * 初回の発話の変数を作る。話題の数は言い足しを含むすべての話題。
 */
export function buildInitialTurnVariables(topics: TurnTopic[]) {
  const first = topics[0];
  return {
    topicCount: String(topics.length),
    firstQuestion: first?.question ?? "このテーマについて、思うことを教えてください。",
    firstQuestionId: first?.label ?? "Q1",
  };
}

/**
 * 初回の発話（1ターン目）のプロンプトを組み立てる純粋関数。
 * 本番（generateInitialQuestion）とシミュレータで同じものを使う。
 */
export function buildInitialSystemPrompt(
  {
    topics,
    persona = INTERVIEW_PERSONA_TEMPLATE,
  }: { topics: TurnTopic[]; persona?: string },
  template: string = INTERVIEW_INITIAL_TEMPLATE
): string {
  return renderPromptTemplate("interview-initial-system", template, {
    persona,
    ...buildInitialTurnVariables(topics),
  });
}
