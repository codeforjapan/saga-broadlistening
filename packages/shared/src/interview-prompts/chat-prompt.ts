import { renderPromptTemplate } from "../prompts/template";
import { buildInterviewDesign } from "./subject-section";
import {
  INTERVIEW_CHAT_TEMPLATE,
  INTERVIEW_PERSONA_TEMPLATE,
} from "./templates";
import type { TurnState, TurnTopic } from "./turn-control";
import { renderChatOutputInstructions, renderTurnState } from "./turn-state";
import type { InterviewConfig, PromptBillInput } from "./types";

export interface InterviewChatPromptInput {
  bill: PromptBillInput;
  interviewConfig: InterviewConfig;
  topics: TurnTopic[];
  turnState: TurnState;
  /** 聞き手の人物像（interview-persona の公開版） */
  persona?: string;
}

/**
 * 対話用（stage = chat）のシステムプロンプトを組み立てる純粋関数。毎ターン全文を作り直す。
 */
export function buildChatSystemPrompt(
  {
    bill,
    interviewConfig,
    topics,
    turnState,
    persona = INTERVIEW_PERSONA_TEMPLATE,
  }: InterviewChatPromptInput,
  template: string = INTERVIEW_CHAT_TEMPLATE
): string {
  const design = buildInterviewDesign({ bill, interviewConfig, topics });
  return renderPromptTemplate("interview-chat-system", template, {
    persona,
    purposeSection: design.purposeSection,
    focusInstruction: design.focusInstruction,
    themeDescription: design.themeDescription,
    knowledgeSection: design.knowledgeSection,
    questionsText: design.questionsText,
    perspectiveTechniques: design.perspectiveTechniques,
    clarificationGuidance: design.clarificationGuidance,
    replyExamples: design.replyExamples,
    turnState: renderTurnState(turnState),
    outputInstructions: renderChatOutputInstructions(turnState),
  });
}
