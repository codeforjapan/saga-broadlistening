import { renderPromptTemplate } from "../prompts/template";
import {
  INTERVIEW_INITIAL_TEMPLATE,
  INTERVIEW_PERSONA_TEMPLATE,
} from "./templates";
import type { TurnTopic } from "./turn-control";

/** 全体像に並べない話題（関わり・言い足し） */
const OUTLINE_EXCLUDED_KINDS = new Set(["fact", "add_more"]);

/**
 * 初回の発話の変数を作る。
 * 話題の数は必須の話題（言い足しを含む）、全体像は関わり・言い足しを除いた話題名。
 */
export function buildInitialTurnVariables(topics: TurnTopic[]) {
  const first = topics[0];
  const outlineTopics = topics.filter(
    (t) => t.required && !OUTLINE_EXCLUDED_KINDS.has(t.kind)
  );
  return {
    topicCount: String(topics.filter((t) => t.required).length),
    topicOutline:
      outlineTopics.map((t) => t.title).join("、") || "いくつかの話題",
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
