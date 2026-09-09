import { BILL_CLARIFICATION_GUIDANCE } from "./bill-clarification-guidance";
import type { InterviewConfig, PromptBillInput } from "./types";

/**
 * インタビューの対象（施策 or テーマ）に関するプロンプトの断片を組み立てる。
 *
 * 施策に紐づく意見募集では従来どおり施策の内容をAIに与えるが、
 * 施策を持たない抽象テーマ型では参照できる施策資料がない。
 * 施策があるかのような空欄を並べるとAIが存在しない施策を語り出すため、
 * 対象そのものをテーマに切り替える。
 */
export function buildInterviewSubject(
  bill: PromptBillInput,
  interviewConfig: InterviewConfig
) {
  const themeName = interviewConfig?.name?.trim() || "";
  const themeDescription = interviewConfig?.description?.trim() || "";

  if (!bill) {
    return {
      /** プロンプト内で対象を指す語 */
      label: "テーマ",
      /** 対象を説明するセクション */
      knowledgeSection: `## インタビューの対象
このインタビューは特定の施策についてではなく、以下のテーマについて市民の経験や考えを伺うものです。

- テーマ名: ${themeName || "（テーマ名未設定）"}

参照できる施策の資料はありません。テーマの説明と回答者の話だけを手がかりにし、
存在しない制度や施策の内容を推測して語らないでください。`,
      /** 「何に集中するか」の指示 */
      focusInstruction: "- テーマに関する質問のみに集中してください",
      /** 施策の誤認を補足するガイダンス（施策がなければ不要） */
      clarificationGuidance: "",
      /** 要約プロンプトの冒頭に置く対象情報 */
      summarySection: `## インタビューの対象
- テーマ名: ${themeName || "（テーマ名未設定）"}
- テーマの説明: ${themeDescription || "（テーマ未設定）"}`,
    };
  }

  const billName = bill.name || "";
  const billTitle = bill.bill_content?.title || "";
  const billSummary = bill.bill_content?.summary || "";
  const billContent = bill.bill_content?.content || "";
  const knowledgeSource = bill.knowledge_source || "";

  return {
    label: "施策",
    knowledgeSection: `## 施策に関する知識
- 施策名: ${billName}
- 施策タイトル: ${billTitle}
- 施策要約: ${billSummary}

施策詳細:
<bill_detail>
${billContent}
</bill_detail>

知識ソース:
<knowledge_source>
${knowledgeSource || "（知識ソース未設定）"}
</knowledge_source>`,
    focusInstruction: "- 施策に関する質問のみに集中してください",
    clarificationGuidance: BILL_CLARIFICATION_GUIDANCE,
    summarySection: `## 施策情報
- 施策名: ${billName}
- 施策タイトル: ${billTitle}
- 施策要約: ${billSummary}`,
  };
}

/**
 * インタビューの冒頭で名乗る対象名。
 *
 * 施策があれば難易度別コンテンツの見出し、なければ施策名、
 * それもなければテーマ名を使う。本番の初回質問生成とシミュレータで揃える。
 */
export function resolveSubjectTitle(
  bill: PromptBillInput,
  interviewConfig: InterviewConfig
): string {
  return (
    bill?.bill_content?.title ||
    bill?.name ||
    interviewConfig?.name ||
    "このテーマ"
  );
}

/**
 * インタビュー開始ターン用に、システムプロンプトへ付け足す指示。
 *
 * 本番（generateInitialQuestion）とシミュレータ（runSimulatedInterview）で
 * 同じ文言を使う。片方だけ直して挙動がずれるのを防ぐため、ここに一本化する。
 */
export function buildInitialTurnInstruction({
  subjectTitle,
  firstQuestionId,
}: {
  subjectTitle: string;
  firstQuestionId: string | null;
}): string {
  return `## 重要: これはインタビューの開始です。ユーザーからのメッセージはありません。事前定義質問の最初の質問から始めてください。挨拶は温かく丁寧に（2文程度）、「${subjectTitle}」についてのインタビューであることを明確に伝えた上で、すぐに最初の質問をしてください。最初の質問にクイックリプライが設定されている場合は、必ず quick_replies フィールドに含めてください。${firstQuestionId ? `最初の質問は ID: ${firstQuestionId} であり、レスポンスの question_id にこの値を含めてください。` : ""}`;
}
