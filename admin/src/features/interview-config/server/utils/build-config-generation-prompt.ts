import "server-only";

import { purposeDisplayName } from "@mirai-gikai/shared/interview-prompts/purpose-types/registry";
import type { ConfigGenerationStage } from "../../shared/schemas";
import type { InterviewDesignInput } from "../../shared/types";
import { DEFAULT_QUESTIONS_TEMPLATE } from "../../shared/utils/default-questions-template";

interface ExistingQuestion {
  question: string;
  follow_up_guide?: string | null;
  quick_replies?: string[] | null;
}

/**
 * 生成の題材。施策があれば施策情報を、なければテーマ名だけを手がかりにする。
 * 抽象テーマ型（施策に紐づかない意見募集）では bill 側が丸ごと存在しない。
 */
export type PromptSubject =
  | {
      kind: "bill";
      billName: string;
      billTitle: string;
      billSummary: string;
      billContent: string;
      knowledgeSource?: string;
      /** 職員が書いたテーマの説明（施策があっても添える） */
      description?: string;
    }
  | { kind: "theme"; themeName: string; themeDescription?: string };

interface BuildPromptParams {
  subject: PromptSubject;
  design?: InterviewDesignInput;
  stage: ConfigGenerationStage;
  existingThemes?: string[];
  existingQuestions?: ExistingQuestion[];
  confirmedQuestions?: ExistingQuestion[];
}

/** プロンプト内で題材を指す語。施策の有無で「施策」「テーマ」を使い分ける */
export function getSubjectLabel(subject: PromptSubject): string {
  return subject.kind === "bill" ? "施策" : "テーマ";
}

/**
 * 質問の書き直しで守るルール。
 * 深掘りの回数や続け方は AI インタビューの実行時に話題ごとの発話予算で決まるため、
 * 質問や観点には回数（「1往復まで」など）を書かせない。
 */
const QUESTION_REWRITE_RULES = `- **質問の順番を変えないこと**。関わり → 場面 → 理由 → 受け止め → 言い足し の流れを崩さない
- **1つの質問には必ず1つの問いだけを含めること**（1問1論点）。複数の論点を1つの質問文に詰め込まない
- **質問文に答えの候補を書かない**（「交通や子育てなど」のような例示は書かない）。範囲の指定（「この1か月で」「1つ」）はよい
- **「決まっていること」の賛否を聞かない**
- 観点（follow_up_guide）は「聞けたら話が豊かになる観点」を**2つまで**。満たすべき条件や手順として書かない
- **質問・観点に回数（「1往復まで」「2〜3回深掘り」など）を書かない**。深掘りの量は実行時に決まる`;

/** 題材の説明セクション（施策情報 or テーマ情報） */
function buildSubjectSection(subject: PromptSubject): string {
  if (subject.kind === "theme") {
    const description = subject.themeDescription?.trim();
    return `## テーマ情報
- テーマ名: ${subject.themeName}
${description ? `- テーマの説明:\n${description}` : "- テーマの説明: （未設定）"}

このインタビューは特定の施策についてではなく、上記テーマについて市民の経験や考えを
広く伺うものです。参照できる施策の資料はないため、存在しない制度や施策を前提にした
質問は作らないでください。`;
  }

  const description = subject.description?.trim();
  return `## 施策情報
- 施策名: ${subject.billName}
- タイトル: ${subject.billTitle}
- 要約: ${subject.billSummary}
- 詳細内容:
${subject.billContent}${description ? `\n- テーマの説明:\n${description}` : ""}`;
}

/**
 * 職員が入力済みの設計を並べるセクション。何も入力されていなければ出さない。
 * テーマの説明は題材のセクションに載せるので、ここには含めない。
 * 「決まっていること」は施策がある意見募集でだけ使う（インタビュー本番と同じ扱い）。
 */
export function buildDesignSection(
  design: InterviewDesignInput | undefined,
  subject: PromptSubject
): string {
  if (!design) return "";

  const opinionFocus = design.opinionFocus?.trim();
  const decidedMatters =
    subject.kind === "bill" ? design.decidedMatters?.trim() : undefined;

  const lines = [
    design.purposeType &&
      `- 目的: ${purposeDisplayName(design.purposeType, subject.kind)}`,
    opinionFocus && `- 市がこれから決めること: ${opinionFocus}`,
    decidedMatters && `- 決まっていること（賛否を聞かない）: ${decidedMatters}`,
  ].filter(Boolean);

  if (lines.length === 0) return "";

  return `

## 意見募集の設計（管理者が入力済み）
${lines.join("\n")}

この設計を前提に提案してください。設計と食い違う論点や質問は作らないでください。`;
}

export function buildConfigGenerationPrompt(params: BuildPromptParams): string {
  const {
    subject,
    design,
    stage,
    existingThemes,
    existingQuestions,
    confirmedQuestions,
  } = params;

  const subjectSection = `${buildSubjectSection(subject)}${buildDesignSection(design, subject)}`;

  const knowledgeSource =
    subject.kind === "bill" ? subject.knowledgeSource : undefined;
  const knowledgeSection = knowledgeSource?.trim()
    ? `\n## ナレッジソース（チームの仮説や補足情報）\n${knowledgeSource}\n`
    : "";

  const subjectLabel = getSubjectLabel(subject);

  const baseRole = `あなたは、市民インタビューの設計を支援する専門家です。
${subjectLabel}に関する市民の意見を効果的に収集するためのインタビューテーマと質問を提案します。
管理者と対話しながら、より良いインタビュー設定を一緒に作り上げてください。`;

  if (stage === "default_questions") {
    const topicsEntry = DEFAULT_QUESTIONS_TEMPLATE.find(
      (e) => e.kind === "quick_replies_slot" && e.slot === "topics"
    );
    const stanceEntry = DEFAULT_QUESTIONS_TEMPLATE.find(
      (e) => e.kind === "quick_replies_slot" && e.slot === "stance"
    );
    if (
      topicsEntry?.kind !== "quick_replies_slot" ||
      stanceEntry?.kind !== "quick_replies_slot"
    ) {
      throw new Error("Template slots topics/stance not found");
    }

    return `${baseRole}

${subjectSection}
${knowledgeSection}
## あなたの役割
この${subjectLabel}に合わせた **2種類のクイックリプライ選択肢** を生成してください。
質問文・観点は固定テンプレートを使うため、あなたは選択肢配列だけ出力します。

## 出力する2種類
1. \`topics\`（Q1 で使う「関心のあるテーマ／論点」の選択肢）
   - 対応する質問: 「${topicsEntry.question}」
   - **論点・テーマ名**を並べる（例: 「AI利用」「罰則」「データ保護」のような制度・対象の名前）
   - 立場や属性は絶対に入れない。
2. \`stance\`（Q2 で使う「立場・関わり方」の選択肢）
   - 対応する質問: 「${stanceEntry.question}」
   - **立場・属性**を並べる（例: 「仕事で〜」「〜の利用者」「〜の保護者」のような人の属性を表す語）
   - 論点・テーマは絶対に入れない。
   - 汎用枠として「一般市民として関心がある」を必ず1件含める。

**特に重要**: \`topics\` と \`stance\` を絶対に取り違えないこと。次のサンプル出力のどちらがどちらか照合してから出力してください。

## サンプル（あくまで参考。${subjectLabel}に合わせて差し替えること）
- topics サンプル（論点）: ${topicsEntry.sample_quick_replies.join(" / ")}
- stance サンプル（立場）: ${stanceEntry.sample_quick_replies.join(" / ")}

## 生成ガイドライン
- \`topics\`: ${subjectLabel}の主要論点の中から、市民が関心を持ちそうなテーマを5件。論点は${subjectLabel}の内容に固有のものとし、抽象論にしない。
- \`stance\`: この${subjectLabel}に関わりのありそうな立場・属性を5件。「一般市民として関心がある」を1件必ず含める。
- 各スロットとも5件挙げること（末尾の「その他（自由記述）」はコード側で自動付与するため**出力に含めない**）。
- 選択肢は各20文字以内を目安に簡潔に。
- **括弧書きの補足（例: 「データ消失（障害・ランサム等）」）は使わない**。選択肢は単一の短い語句のみ。

## 出力形式
- text: 生成意図の短い説明
- topics: string[] （論点の選択肢、5件）
- stance: string[] （立場の選択肢、5件）`;
  }

  if (stage === "question_proposal") {
    const existingQuestionsSection =
      existingQuestions && existingQuestions.length > 0
        ? `\n## 現在設定されている質問\n${existingQuestions.map((q, i) => `${i + 1}. ${q.question}${q.follow_up_guide ? `\n   観点: ${q.follow_up_guide}` : ""}${q.quick_replies?.length ? `\n   選択肢: ${q.quick_replies.join(", ")}` : ""}`).join("\n")}\n\n管理者は既存の質問のブラッシュアップを希望しています。既存質問を踏まえて改善提案をしてください。`
        : "";

    return `${baseRole}

${subjectSection}
${knowledgeSection}${existingQuestionsSection}

## あなたの役割
管理者の要望に沿って、インタビュー質問をブラッシュアップしてください。

## 質問提案のガイドライン
${QUESTION_REWRITE_RULES}
- 自由回答を促す開かれた質問にする
- 事実を聞く質問・受け止めの質問にはクイックリプライ（3〜5個）を用意する
- **クイックリプライに括弧書きの補足（例: 「データ消失（障害・ランサム等）」）は使わない**。選択肢は単一の短い語句（20文字以内目安）のみ。補足が必要なら観点側に記載する。
- ナレッジソースがある場合は、その情報も踏まえた質問にする

## 各質問に含めるフィールド
- question: 質問文（1つの問いに絞り、分かりやすく端的に）
- follow_up_guide: 観点（任意、聞けたら話が豊かになる観点を2つまで）
- quick_replies: クイックリプライの選択肢（任意、3〜5個）

## 出力形式
- text: 提案の概要説明（調整意図など）
- questions: 質問オブジェクトの配列（修正後の全質問を必ず含めること）`;
  }

  if (stage === "theme_proposal") {
    const confirmedQuestionsSection =
      confirmedQuestions && confirmedQuestions.length > 0
        ? `\n## 確定済みの質問\n${confirmedQuestions.map((q, i) => `${i + 1}. ${q.question}${q.follow_up_guide ? `\n   観点: ${q.follow_up_guide}` : ""}${q.quick_replies?.length ? `\n   選択肢: ${q.quick_replies.join(", ")}` : ""}`).join("\n")}\n`
        : "";

    const existingThemesSection =
      existingThemes && existingThemes.length > 0
        ? `\n## 現在設定されているテーマ\n${existingThemes.map((t) => `- ${t}`).join("\n")}\n\n管理者は既存のテーマのブラッシュアップを希望しています。既存テーマを踏まえて改善提案をしてください。`
        : "";

    return `${baseRole}

${subjectSection}
${knowledgeSection}${confirmedQuestionsSection}${existingThemesSection}
## あなたの役割
確定済みの質問内容と${subjectLabel}の情報をもとに、このインタビューで扱うテーマを提案してください。
テーマは、後段の分析で論点を集計・分類するためのラベルとして使われます。

## テーマ提案のガイドライン
- 確定質問で実際に聞かれている論点を漏れなくカバーする
- ${subjectLabel}の主要論点に対応するテーマにする
- 市民の生活や仕事への影響に関連する
- 具体的かつ分かりやすい表現にする
- 件数は${subjectLabel}の内容と質問に応じて3〜6件程度を目安とする（固定ではない）

## 出力形式
- text: 提案の概要説明（なぜこれらのテーマにしたか）
- themes: テーマの配列

管理者からの修正要望があれば、それに応じてテーマを調整してください。
修正する場合は、修正後の全テーマを themes に含めてください。`;
  }

  return baseRole;
}
