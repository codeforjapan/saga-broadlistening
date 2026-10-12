import {
  BILL_CLARIFICATION_GUIDANCE,
  THEME_CLARIFICATION_GUIDANCE,
} from "./bill-clarification-guidance";
import { DEFAULT_CONSULTATION_DESK } from "./constants";
import {
  getPurposeDefinition,
  purposeDisplayName,
} from "./purpose-types/registry";
import {
  type InterviewSubjectKind,
  STEP_KIND_LABELS,
} from "./purpose-types/types";
import type { TurnTopic } from "./turn-control";
import type { InterviewConfig, PromptBillInput } from "./types";

/**
 * インタビューの対象（施策 or テーマ）に関するプロンプトの断片を組み立てる。
 *
 * 施策に紐づく意見募集では施策の資料をAIに与えるが、施策を持たない抽象テーマ型では
 * 参照できる資料がない。施策があるかのような空欄を並べるとAIが存在しない施策を
 * 語り出すため、対象そのものをテーマに切り替える。
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
      kind: "theme" as InterviewSubjectKind,
      knowledgeSection: `# 参考知識
このインタビューは特定の施策についてではなく、テーマ「${themeName || "（テーマ名未設定）"}」について市民の経験や考えを伺うものです。
参照できる施策の資料はありません。テーマの説明と回答者の話だけを手がかりにし、存在しない制度や施策の内容を推測して語らないでください。`,
      clarificationGuidance: THEME_CLARIFICATION_GUIDANCE,
      /** 要約プロンプトの冒頭に置く対象情報 */
      summarySection: `# インタビューの対象
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
    kind: "bill" as InterviewSubjectKind,
    knowledgeSection: `# 施策の資料（事実の補足はこの範囲だけ）
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
    clarificationGuidance: BILL_CLARIFICATION_GUIDANCE,
    summarySection: `# 施策情報
- 施策名: ${billName}
- 施策タイトル: ${billTitle}
- 施策要約: ${billSummary}`,
  };
}

const PLACE_LABELS = {
  chikat: "CHIKAT の結果ページ",
  city_web: "市ホームページ",
  koho: "広報紙",
} as const;

/** 結果を知らせる時期と場所の文 */
export function buildPublicationText(config: InterviewConfig): string {
  const timing = config?.publication_timing?.trim();
  const place = config?.publication_place;
  if (config?.publication_mode === "scheduled" && timing && place) {
    return `${timing}、${PLACE_LABELS[place]}で`;
  }
  return "まとまり次第、CHIKAT の結果ページで";
}

const GENERIC_FOCUS =
  "その人の暮らしの場面から、経験と考えを聞きます。評価や意見だけでなく、そう思うきっかけになった出来事を大事にします。";
const GENERIC_PERSPECTIVE =
  "一般論の答えには、最近の1回の場面を聞く。良し悪しを先に聞かない。";

/** `[Q2｜名前｜種類｜発話○回まで｜必須] 質問／観点：…` の形で話題を並べる */
export function buildQuestionsText(topics: TurnTopic[]): string {
  if (topics.length === 0) return "（話題は設定されていません）";
  return topics
    .map((t) => {
      const budget =
        t.turnBudget === 1 ? "発話1回" : `発話${t.turnBudget}回まで`;
      const head = `[${t.label}｜${t.title}｜${STEP_KIND_LABELS[t.kind]}｜${budget}｜${t.required ? "必須" : "任意"}]`;
      return `${head} ${t.question}${t.hint ? `／観点：${t.hint}` : ""}`;
    })
    .join("\n");
}

/**
 * 対話用テンプレートのうち、意見募集の設定から決まる変数をまとめて作る。
 */
export function buildInterviewDesign({
  bill,
  interviewConfig,
  topics,
  consultationDesk = DEFAULT_CONSULTATION_DESK,
}: {
  bill: PromptBillInput;
  interviewConfig: InterviewConfig;
  topics: TurnTopic[];
  consultationDesk?: string;
}) {
  const subject = buildInterviewSubject(bill, interviewConfig);
  const purposeType = interviewConfig?.purpose_type ?? null;
  const definition = purposeType ? getPurposeDefinition(purposeType) : null;
  const variant = definition?.[subject.kind];
  const publicationText = buildPublicationText(interviewConfig);
  const decided =
    subject.kind === "bill" ? interviewConfig?.decided_matters?.trim() : "";

  const purposeSection = [
    `- タイトル：${interviewConfig?.name?.trim() || "（タイトル未設定）"}`,
    `- 目的：${purposeDisplayName(purposeType, subject.kind)}`,
    `- 市がこれから決めること：${interviewConfig?.opinion_focus?.trim() || "（設定なし）"}`,
    `- 決まっていること（賛否を聞かない）：${decided || "なし"}`,
    `- 結果を知らせる時期と場所：${publicationText}（聞かれたら伝える）`,
    `- 個別のご相談の窓口：${consultationDesk}`,
  ].join("\n");

  return {
    subject,
    publicationText,
    purposeSection,
    focusInstruction: definition?.focusInstruction ?? GENERIC_FOCUS,
    themeDescription:
      interviewConfig?.description?.trim() ||
      (subject.kind === "bill" ? "（施策の資料を参照）" : "（テーマ未設定）"),
    knowledgeSection: subject.knowledgeSection,
    questionsText: buildQuestionsText(topics),
    perspectiveTechniques: variant?.perspectiveTechniques ?? GENERIC_PERSPECTIVE,
    replyExamples: variant?.replyExamples ?? "",
    clarificationGuidance: subject.clarificationGuidance,
    consultationDesk,
  };
}

/**
 * インタビューの冒頭で名乗る対象名。
 *
 * 施策があれば難易度別コンテンツの見出し、なければ施策名、
 * それもなければテーマ名を使う。
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
