import { purposeDisplayName } from "@mirai-gikai/shared/interview-prompts/purpose-types/registry";
import { describe, expect, it } from "vitest";
import {
  buildConfigGenerationPrompt,
  buildDesignSection,
  buildQuestionRewriteRules,
} from "./build-config-generation-prompt";

const billSubject = {
  kind: "bill" as const,
  billName: "テスト施策",
  billTitle: "テストタイトル",
  billSummary: "テスト要約",
  billContent: "テスト内容の詳細",
};

const baseParams = {
  subject: billSubject,
  stage: "theme_proposal" as const,
};

describe("buildConfigGenerationPrompt", () => {
  describe("共通部分", () => {
    it("ベースロール（専門家の役割）を含む", () => {
      const result = buildConfigGenerationPrompt(baseParams);
      expect(result).toContain("市民インタビューの設計を支援する専門家です");
    });

    it("施策情報セクションを含む", () => {
      const result = buildConfigGenerationPrompt(baseParams);
      expect(result).toContain("## 施策情報");
      expect(result).toContain("施策名: テスト施策");
      expect(result).toContain("タイトル: テストタイトル");
      expect(result).toContain("要約: テスト要約");
      expect(result).toContain("テスト内容の詳細");
    });
  });

  describe("default_questionsステージ", () => {
    const params = {
      ...baseParams,
      stage: "default_questions" as const,
    };

    it("Q1/Q2 の固定質問文をプロンプトに含める", () => {
      const result = buildConfigGenerationPrompt(params);
      expect(result).toContain("topics");
      expect(result).toContain("stance");
      expect(result).toContain("テーマを選んでください");
      expect(result).toContain("立場・関わり方");
    });

    it("出力形式に topics / stance を配列で指定する", () => {
      const result = buildConfigGenerationPrompt(params);
      expect(result).toContain("topics: string[]");
      expect(result).toContain("stance: string[]");
    });

    it("クイックリプライを5件指定する指示を含む", () => {
      const result = buildConfigGenerationPrompt(params);
      expect(result).toContain("5件");
    });

    it("クイックリプライの括弧書き禁止ルールを含む", () => {
      const result = buildConfigGenerationPrompt(params);
      expect(result).toContain("括弧書きの補足");
    });

    it("「その他（自由記述）」を LLM 出力に含めない指示", () => {
      const result = buildConfigGenerationPrompt(params);
      expect(result).toContain("その他（自由記述）");
      expect(result).toContain("出力に含めない");
    });
  });

  describe("theme_proposalステージ", () => {
    it("テーマ提案のガイドラインを含む", () => {
      const result = buildConfigGenerationPrompt(baseParams);
      expect(result).toContain("テーマ提案のガイドライン");
    });

    it("出力形式にthemesを指定する", () => {
      const result = buildConfigGenerationPrompt(baseParams);
      expect(result).toContain("themes: テーマの配列");
    });

    it("確定済み質問がある場合、質問一覧を含む", () => {
      const result = buildConfigGenerationPrompt({
        ...baseParams,
        confirmedQuestions: [
          {
            question: "質問A",
            follow_up_guide: "観点A",
            quick_replies: ["選択肢1", "選択肢2"],
          },
          { question: "質問B" },
        ],
      });
      expect(result).toContain("## 確定済みの質問");
      expect(result).toContain("1. 質問A");
      expect(result).toContain("観点: 観点A");
      expect(result).toContain("選択肢: 選択肢1, 選択肢2");
      expect(result).toContain("2. 質問B");
    });

    it("既存テーマがある場合、ブラッシュアップ指示を含む", () => {
      const result = buildConfigGenerationPrompt({
        ...baseParams,
        existingThemes: ["既存テーマ1", "既存テーマ2"],
      });
      expect(result).toContain("## 現在設定されているテーマ");
      expect(result).toContain("- 既存テーマ1");
      expect(result).toContain("ブラッシュアップ");
    });

    it("ナレッジソースなしの場合、ナレッジソースセクションヘッダーを含まない", () => {
      const result = buildConfigGenerationPrompt(baseParams);
      expect(result).not.toContain(
        "## ナレッジソース（チームの仮説や補足情報）"
      );
    });

    it("ナレッジソースありの場合、ナレッジセクションを含む", () => {
      const result = buildConfigGenerationPrompt({
        ...baseParams,
        subject: { ...billSubject, knowledgeSource: "チームの仮説内容" },
      });
      expect(result).toContain("ナレッジソース");
      expect(result).toContain("チームの仮説内容");
    });

    it("ナレッジソースが空白のみの場合、ナレッジソースセクションヘッダーを含まない", () => {
      const result = buildConfigGenerationPrompt({
        ...baseParams,
        subject: { ...billSubject, knowledgeSource: "   " },
      });
      expect(result).not.toContain(
        "## ナレッジソース（チームの仮説や補足情報）"
      );
    });
  });

  describe("question_proposalステージ", () => {
    const questionParams = {
      ...baseParams,
      stage: "question_proposal" as const,
    };

    it("質問提案のガイドラインを含む", () => {
      const result = buildConfigGenerationPrompt(questionParams);
      expect(result).toContain("質問提案のガイドライン");
    });

    it.each([
      { kind: "bill" as const },
      { kind: "theme" as const },
    ])("$kind 型でも共通の書き直しルールを含み、回数を書かせない", ({
      kind,
    }) => {
      const result = buildConfigGenerationPrompt({
        ...questionParams,
        ...(kind === "theme"
          ? { subject: { kind: "theme" as const, themeName: "佐賀での暮らし" } }
          : {}),
      });
      expect(result).toContain("「なぜ」で理由を問う質問文を書かない");
      expect(result).toContain("質問文に答えの候補を書かない");
      expect(result).toContain("「決まっていること」の賛否を聞かない");
      expect(result).toContain("**2つまで**");
      expect(result).toContain(
        "回数（「1往復まで」「2〜3回深掘り」など）を書かない"
      );
      expect(result).not.toContain("1往復までの追加確認に留める");
      expect(result).not.toContain("2〜3往復まで深掘りしてよい");
    });

    it("出力形式にquestionsを指定する", () => {
      const result = buildConfigGenerationPrompt(questionParams);
      expect(result).toContain("questions: 質問オブジェクトの配列");
    });

    it("既存質問がある場合、ブラッシュアップ指示を含む", () => {
      const result = buildConfigGenerationPrompt({
        ...questionParams,
        existingQuestions: [
          {
            question: "既存質問1",
            follow_up_guide: "既存フォローアップ",
            quick_replies: ["選択肢1"],
          },
        ],
      });
      expect(result).toContain("## 現在設定されている質問");
      expect(result).toContain("1. 既存質問1");
      expect(result).toContain("観点: 既存フォローアップ");
      expect(result).toContain("選択肢: 選択肢1");
      expect(result).toContain("ブラッシュアップ");
    });

    it("各質問フィールドの説明を含む", () => {
      const result = buildConfigGenerationPrompt(questionParams);
      expect(result).toContain("question: 質問文");
      expect(result).toContain("follow_up_guide: 観点");
      expect(result).toContain("quick_replies: クイックリプライの選択肢");
    });

    it("クイックリプライの括弧書き禁止ルールを含む", () => {
      const result = buildConfigGenerationPrompt(questionParams);
      expect(result).toContain("括弧書きの補足");
    });

    it("ナレッジソースありの場合、ナレッジセクションを含む", () => {
      const result = buildConfigGenerationPrompt({
        ...questionParams,
        subject: { ...billSubject, knowledgeSource: "補足情報" },
      });
      expect(result).toContain("ナレッジソース");
      expect(result).toContain("補足情報");
    });
  });

  describe("不明なステージ", () => {
    it("ベースロールのみを返す", () => {
      const result = buildConfigGenerationPrompt({
        ...baseParams,
        stage: "theme_confirmed" as "theme_proposal",
      });
      expect(result).toContain("市民インタビューの設計を支援する専門家です");
      expect(result).not.toContain("テーマ提案のガイドライン");
      expect(result).not.toContain("質問提案のガイドライン");
    });
  });

  describe("施策に紐づかないテーマ（抽象テーマ型）", () => {
    const themeParams = {
      subject: { kind: "theme" as const, themeName: "佐賀市のみらい" },
      stage: "theme_proposal" as const,
    };

    it("施策情報のかわりにテーマ情報を載せる", () => {
      const result = buildConfigGenerationPrompt(themeParams);

      expect(result).toContain("## テーマ情報");
      expect(result).toContain("テーマ名: 佐賀市のみらい");
      expect(result).not.toContain("## 施策情報");
    });

    it("存在しない施策を前提にした質問を作らないよう指示する", () => {
      const result = buildConfigGenerationPrompt(themeParams);

      expect(result).toContain(
        "存在しない制度や施策を前提にした\n質問は作らないでください"
      );
    });

    it("ナレッジソースのセクションは出さない", () => {
      const result = buildConfigGenerationPrompt(themeParams);

      expect(result).not.toContain(
        "## ナレッジソース（チームの仮説や補足情報）"
      );
    });
  });
});

describe("buildDesignSection", () => {
  const themeSubject = { kind: "theme" as const, themeName: "佐賀市のみらい" };

  it("入力済みの目的・決めること・決まっていることを並べる", () => {
    const result = buildDesignSection(
      {
        purposeType: "discover",
        opinionFocus: "路線の優先順位",
        decidedMatters: "来年度から運行開始",
      },
      billSubject
    );

    expect(result).toContain("## 意見募集の設計（管理者が入力済み）");
    expect(result).toContain(
      `- 目的: ${purposeDisplayName("discover", "bill")}`
    );
    expect(result).toContain("- 市がこれから決めること: 路線の優先順位");
    expect(result).toContain(
      "- 決まっていること（賛否を聞かない）: 来年度から運行開始"
    );
  });

  it("施策がないときは、決まっていることを載せない", () => {
    const result = buildDesignSection(
      {
        purposeType: "discover",
        opinionFocus: null,
        decidedMatters: "来年度から運行開始",
      },
      themeSubject
    );

    expect(result).toContain(
      `- 目的: ${purposeDisplayName("discover", "theme")}`
    );
    expect(result).not.toContain("決まっていること");
  });

  it("何も入力されていなければセクションを出さない", () => {
    expect(
      buildDesignSection(
        { purposeType: null, opinionFocus: "  ", decidedMatters: null },
        billSubject
      )
    ).toBe("");
    expect(buildDesignSection(undefined, billSubject)).toBe("");
  });
});

describe("buildConfigGenerationPrompt（職員が入力済みの設計と説明）", () => {
  it("生成プロンプトの題材セクションの直後に入る", () => {
    const result = buildConfigGenerationPrompt({
      ...baseParams,
      design: {
        purposeType: null,
        opinionFocus: "路線の優先順位",
        decidedMatters: null,
      },
    });

    expect(result.indexOf("## 施策情報")).toBeLessThan(
      result.indexOf("## 意見募集の設計")
    );
    expect(result).toContain("- 市がこれから決めること: 路線の優先順位");
  });

  it("施策があるときも、テーマの説明は施策情報のセクションに添える", () => {
    const result = buildConfigGenerationPrompt({
      ...baseParams,
      subject: {
        ...billSubject,
        description: "通勤・通学の足について聞きます",
      },
    });

    expect(result).toContain("- テーマの説明:\n通勤・通学の足について聞きます");
  });
});

describe("buildQuestionRewriteRules", () => {
  it("目的がないときは、深掘りにあたる質問を作らせず、観点にまとめさせる", () => {
    const rules = buildQuestionRewriteRules(undefined, billSubject);

    expect(rules).toContain("関わり → 場面 → 影響・受け止め");
    expect(rules).toContain("深掘りにあたる質問は作らない");
    expect(rules).toContain("質問の数は減ってよい");
    expect(rules).toContain("残す質問の順番は変えない");
    expect(rules).toContain("入りきらない分は落とす");
    expect(rules).not.toContain("場面 → 理由 → 受け止め");
  });

  it("目的があるときは、目的別テンプレートの並びを保たせ、深掘りの質問を消させない", () => {
    const rules = buildQuestionRewriteRules(
      { purposeType: "understand", opinionFocus: null, decidedMatters: null },
      billSubject
    );

    expect(rules).toContain(
      `目的「${purposeDisplayName("understand", "bill")}」の質問の並びを保つ`
    );
    expect(rules).toContain("追加・削除・統合・並べ替えはせず");
    expect(rules).not.toContain("深掘りにあたる質問は作らない");
    expect(rules).not.toContain("質問の数は減ってよい");
  });

  it("質問提案のプロンプトには、設計の目的に応じたルールが入る", () => {
    const result = buildConfigGenerationPrompt({
      ...baseParams,
      stage: "question_proposal",
      design: {
        purposeType: "discover",
        opinionFocus: null,
        decidedMatters: null,
      },
    });

    expect(result).toContain("の質問の並びを保つ");
  });
});
