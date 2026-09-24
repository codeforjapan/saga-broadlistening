import { BILL_CLARIFICATION_GUIDANCE } from "./bill-clarification-guidance";
import type { InterviewConfig, PromptBillInput } from "./types";

const BILL_PERSPECTIVE_TECHNIQUES = `- **仮定質問**: 「もしこの施策が実施されたら、あなたの○○はどう変わると思いますか？」「実施されなかった場合は？」と具体的なシナリオを想像させる
- **逆側の視点**: 賛成の方には「一方で懸念される点はありますか？」、反対の方には「期待できる点があるとすれば？」と多角的な視点を引き出す`;

// 暮らしのテーマでは、施策の賛否を前提にした例文を渡すと存在しない施策を語り出す
const THEME_PERSPECTIVE_TECHNIQUES = `- **仮定質問**: 回答者が話した内容をもとに「もし○○が身近にあったら、毎日の過ごし方はどう変わりそうですか？」と具体的な場面を想像してもらう
- **逆側の視点**: 不便さを話した方には「逆に、今の暮らしで気に入っているところは？」、良さを話した方には「一方で物足りないところは？」と多角的な視点を引き出す`;

const BILL_REPLY_EXAMPLES = `悪い例: 「この施策で家計にどんな影響や変化が生まれますか？たとえば、負担が減る点や、逆に心配な点もあれば教えてください」
→ 質問が複数あり、抽象的な言葉が並んでいて答えにくい

良い例: 「給食費が毎月の負担になっているんですね。無償になったら、浮いたお金はどんなことに使いたいですか？」`;

// 暮らしのテーマで実際に出た失敗（複数質問・聞き直し）をそのまま例にしている
const THEME_REPLY_EXAMPLES = `悪い例: 「そのようなイベントが少ないと感じるとき、具体的にどんな場面や感情が生まれますか？たとえば、参加したいと感じたときにどのような障壁があったか、またその影響でどんなことを諦めたりしていますか？」
→ 質問が3つあり、抽象的な言葉が並んでいて答えにくい

良い例: 「同世代で集まれる場がほとんどないと、一人で続けるしかないですよね。地元の外のイベントには、実際に足を運んだことはありますか？」

悪い例: （「同世代がいないのが障壁」と答えた直後に）「参加したいと考えていたイベントで、どんなことがあったか教えていただけますか？」
→ 直前の答えを踏まえず、別の方向から聞き直している

良い例: 「同世代がいないことが大きいんですね。同世代の仲間がいたら、どんなことを一緒にやってみたいですか？」`;

const BILL_STOP_CRITERIA = `## 深掘りの打ち切り基準
深掘りは**施策に対する意見形成に役立つレベル**で止めてください。以下のサインが出たら、それ以上同じ方向に掘り下げず、視点を変えるか次のテーマに移ってください：

- **施策の論点から離れた**: 回答が施策の賛否・影響・制度設計ではなく、個人の業務テクニックや日常の具体的手順（例：授業での教え方の工夫、特定の作業手順）の話になった
- **一般化できない回答が来た**: 「それは場合による」「ケースバイケース」など、これ以上掘っても施策への示唆が得られないサインが出た
- **具体例を1〜2つ得た**: 1つの論点について具体的なエピソードや事例を1〜2つ引き出せたら、その方向の深掘りは十分。同じ方向に3回以上連続で掘り下げない
- **回答者が話題転換を求めた**: 回答者が別のテーマに戻りたい・移りたいサインを出した場合は即座に従う

打ち切り後の展開例：
- 「ありがとうございます。では視点を変えて…」と別の角度（例：他の教科、他の立場、制度面）へ広げる
- 「なるほど、では施策の制度としては…」と施策レベルの議論に引き戻す
- 次の事前定義質問に移る（移り方は「話題の移り方」に従う）`;

// 施策向けの基準（日常の話は打ち切る）をテーマ型に渡すと、集めたいエピソードの途中で話題を変えてしまう
const THEME_STOP_CRITERIA = `## 深掘りの打ち切り基準
このインタビューでは、回答者の日常の具体的なエピソードや気持ちそのものが集めたい情報です。趣味・仕事・家族など個人的な話でも、テーマに関わる経験であれば打ち切らずに掘り下げてください。以下のサインが出たら、それ以上同じ方向に掘り下げず、視点を変えるか次のテーマに移ってください：

- **答えが出てこない**: 「分からない」「特にない」「まだない」といった回答が続いた
- **同じ内容の繰り返し**: 新しいエピソードや気持ちが出てこず、同じ話の言い換えになった
- **十分に聞けた**: 1つの話題について、きっかけ・具体的なエピソード・そのときの気持ちや暮らしへの影響が聞けた
- **回答者が話題転換を求めた**: 回答者が別のテーマに戻りたい・移りたいサインを出した場合は即座に従う

打ち切り後の展開例：
- 同じ話題を別の角度（例：関わる人、時間帯、お金、場所）から聞く
- 次の事前定義質問に移る（移り方は「話題の移り方」に従う）`;

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
      /** 深掘りテクニックのうち、対象によって例が変わるもの */
      perspectiveTechniques: THEME_PERSPECTIVE_TECHNIQUES,
      /** 深掘りをどこで止めるか */
      stopCriteria: THEME_STOP_CRITERIA,
      /** 返答の良い例・悪い例 */
      replyExamples: THEME_REPLY_EXAMPLES,
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
    perspectiveTechniques: BILL_PERSPECTIVE_TECHNIQUES,
    stopCriteria: BILL_STOP_CRITERIA,
    replyExamples: BILL_REPLY_EXAMPLES,
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
  return `## 重要: これはインタビューの開始です。ユーザーからのメッセージはありません。事前定義質問の最初の質問から始めてください。挨拶は温かく丁寧に（2文程度）、「${subjectTitle}」についてのインタビューであることを明確に伝えた上で、すぐに最初の質問をしてください。最初の質問にクイックリプライが設定されている場合は、必ず quick_replies フィールドに含めてください。設定されていない場合も quick_replies を省略せず空配列 [] を出力してください。${firstQuestionId ? `最初の質問は ID: ${firstQuestionId} であり、レスポンスの question_id にこの値を含めてください。` : ""}`;
}
