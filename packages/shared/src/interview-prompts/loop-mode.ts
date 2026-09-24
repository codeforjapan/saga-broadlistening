import { renderPromptTemplate } from "../prompts/template";
import { INTERVIEW_CHAT_TEMPLATE } from "./templates";
import {
  buildLoopModeStageGuidance,
  buildTimeManagementGuidance,
} from "./stage-transition-guidance";
import { buildInterviewSubject } from "./subject-section";
import type { InterviewPromptInput } from "./types";

/**
 * Loop Mode（都度深掘りモード）のシステムプロンプトを構築する純粋関数
 */
export function buildLoopModeSystemPrompt(
  params: InterviewPromptInput,
  template: string = INTERVIEW_CHAT_TEMPLATE
): string {
  const {
    bill,
    interviewConfig,
    questions,
    currentStage,
    askedQuestionIds,
    remainingMinutes,
  } = params;

  const themeDescription = interviewConfig?.description || "";
  const subject = buildInterviewSubject(bill, interviewConfig);

  // Loop Mode: follow_up_guide を含める
  const questionsText = questions
    .map(
      (q, index) =>
        `${index + 1}. [ID: ${q.id}] ${q.question}${q.follow_up_guide ? `\n   フォローアップ指針: ${q.follow_up_guide}` : ""}${q.quick_replies ? `\n   クイックリプライ: ${q.quick_replies.join(", ")}` : ""}`
    )
    .join("\n");

  // ステージ遷移ガイダンスを構築
  const stageTransitionGuidance = buildLoopModeStageGuidance({
    currentStage,
    questions,
    askedQuestionIds,
  });

  // タイムマネジメントガイダンスを構築
  const remainingQuestionsCount =
    questions.length -
    questions.filter((q) => askedQuestionIds.has(q.id)).length;
  const timeManagementGuidance = buildTimeManagementGuidance({
    remainingMinutes,
    remainingQuestions: remainingQuestionsCount,
  });

  const outputInstructions = `${timeManagementGuidance}

## クイックリプライについて
- 事前定義質問そのものをこれから行う場合は、その質問のIDをレスポンスの \`question_id\` フィールドに含めてください
- 事前定義質問にクイックリプライが設定されている場合、その質問をする際はレスポンスの \`quick_replies\` フィールドにその選択肢を含めてください
- 選択肢がない場合も、\`quick_replies\` は省略せず空配列 [] を出力してください
- 深掘り質問など、事前定義質問以外の質問をする場合は \`question_id\` は省略せず null を出力してください
- 深掘り質問でも選択肢形式で聞きたい場合は、\`quick_replies\` フィールドに選択肢を含めてください（\`question_id\` は null にしてください）
- 「次のうちどれに近いですか？」のように選択を促す質問をする場合は、**必ず** \`quick_replies\` に選択肢を含めてください。テキストだけで選択肢を示してはいけません

## トピックタイトルについて
- 事前定義質問をこれから行う場合は、\`topic_title\` フィールドにその質問のテーマを短く（20文字以内）で記載してください
- 例: 「業務への影響」「家計への影響」「医療制度の変化」
- 深掘り質問など、事前定義質問以外の質問をする場合は \`topic_title\` は省略せず null を出力してください

${stageTransitionGuidance}
`;

  return renderPromptTemplate("interview-chat-system", template, {
    focusInstruction: subject.focusInstruction,
    clarificationGuidance: subject.clarificationGuidance ? `\n${subject.clarificationGuidance}\n` : "",
    knowledgeSection: subject.knowledgeSection,
    perspectiveTechniques: subject.perspectiveTechniques,
    stopCriteria: subject.stopCriteria,
    replyExamples: subject.replyExamples,
    themeDescription: themeDescription || "（テーマ未設定）",
    questionsText: questionsText || "（賛成か、反対か）",
    outputInstructions,
  });
}
