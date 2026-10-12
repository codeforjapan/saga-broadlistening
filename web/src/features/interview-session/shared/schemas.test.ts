import { describe, expect, it } from "vitest";
import {
  interviewChatResponseSchema,
  interviewChatTextSchema,
  interviewChatWithReportSchema,
  interviewReportSchema,
  interviewStageSchema,
} from "./schemas";

// テスト用の有効なcontent_richnessデータ
const validContentRichness = {
  total: 80,
  clarity: 70,
  specificity: 60,
  impact: 50,
  constructiveness: 40,
  reasoning: "テストの根拠",
};

// テスト用の有効なreportデータ
const validReport = {
  summary: "テストのサマリー",
  final_text: "テストの提出意見本文",
  role_description: "テストの役割説明",
  role_title: "研究者",
  opinions: [
    {
      title: "テスト意見",
      content: "テスト内容",
      source_message_id: null,
      contextual_quote: null,
      richness: 60,
      concern: null,
      proposal: null,
      reasoning_types: null,
    },
  ],
  content_richness: validContentRichness,
};

describe("contentRichnessValueSchema (via interviewReportSchema)", () => {
  it("正常な整数値をそのまま受け入れる", () => {
    const result = interviewReportSchema.parse(validReport);
    expect(result.content_richness.total).toBe(80);
  });

  it("小数を四捨五入する (50.7 → 51)", () => {
    const result = interviewReportSchema.parse({
      ...validReport,
      content_richness: { ...validContentRichness, total: 50.7 },
    });
    expect(result.content_richness.total).toBe(51);
  });

  it("小数を四捨五入する (50.3 → 50)", () => {
    const result = interviewReportSchema.parse({
      ...validReport,
      content_richness: { ...validContentRichness, total: 50.3 },
    });
    expect(result.content_richness.total).toBe(50);
  });

  it("境界値 0 を受け入れる", () => {
    const result = interviewReportSchema.parse({
      ...validReport,
      content_richness: { ...validContentRichness, total: 0 },
    });
    expect(result.content_richness.total).toBe(0);
  });

  it("境界値 100 を受け入れる", () => {
    const result = interviewReportSchema.parse({
      ...validReport,
      content_richness: { ...validContentRichness, total: 100 },
    });
    expect(result.content_richness.total).toBe(100);
  });

  it("範囲外の値 -1 を拒否する", () => {
    const result = interviewReportSchema.safeParse({
      ...validReport,
      content_richness: { ...validContentRichness, total: -1 },
    });
    expect(result.success).toBe(false);
  });

  it("範囲外の値 101 を拒否する", () => {
    const result = interviewReportSchema.safeParse({
      ...validReport,
      content_richness: { ...validContentRichness, total: 101 },
    });
    expect(result.success).toBe(false);
  });

  it("非数値を拒否する", () => {
    const result = interviewReportSchema.safeParse({
      ...validReport,
      content_richness: { ...validContentRichness, total: "fifty" },
    });
    expect(result.success).toBe(false);
  });

  it("全フィールドで小数が丸められる", () => {
    const result = interviewReportSchema.parse({
      ...validReport,
      content_richness: {
        total: 80.6,
        clarity: 70.4,
        specificity: 60.5,
        impact: 50.1,
        constructiveness: 40.9,
        reasoning: "テスト",
      },
    });
    expect(result.content_richness.total).toBe(81);
    expect(result.content_richness.clarity).toBe(70);
    expect(result.content_richness.specificity).toBe(61);
    expect(result.content_richness.impact).toBe(50);
    expect(result.content_richness.constructiveness).toBe(41);
  });
});

describe("interviewReportSchema", () => {
  it("正常な完全データをパースできる", () => {
    const result = interviewReportSchema.parse(validReport);
    expect(result).toEqual(validReport);
  });

  it("strictモードで余計なフィールドを拒否する", () => {
    const result = interviewReportSchema.safeParse({
      ...validReport,
      extraField: "不正",
    });
    expect(result.success).toBe(false);
  });

  describe("null許容フィールド", () => {
    it("summary に null を許容する", () => {
      const result = interviewReportSchema.parse({
        ...validReport,
        summary: null,
      });
      expect(result.summary).toBeNull();
    });

    it("role_description に null を許容する", () => {
      const result = interviewReportSchema.parse({
        ...validReport,
        role_description: null,
      });
      expect(result.role_description).toBeNull();
    });

    it("role_title に null を許容する", () => {
      const result = interviewReportSchema.parse({
        ...validReport,
        role_title: null,
      });
      expect(result.role_title).toBeNull();
    });
  });

  describe("role_title", () => {
    it("10文字以内を受け入れる", () => {
      const result = interviewReportSchema.parse({
        ...validReport,
        role_title: "1234567890",
      });
      expect(result.role_title).toBe("1234567890");
    });

    it("10文字超を拒否する", () => {
      const result = interviewReportSchema.safeParse({
        ...validReport,
        role_title: "12345678901",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("opinions", () => {
    it("3件まで受け入れる", () => {
      const result = interviewReportSchema.parse({
        ...validReport,
        opinions: [
          {
            title: "意見1",
            content: "内容1",
            source_message_id: null,
            contextual_quote: null,
            richness: 50,
            concern: null,
            proposal: null,
            reasoning_types: null,
          },
          {
            title: "意見2",
            content: "内容2",
            source_message_id: "msg-1",
            contextual_quote: "（テーマについて）意見2の根拠",
            richness: 80,
            concern: null,
            proposal: null,
            reasoning_types: null,
          },
          {
            title: "意見3",
            content: "内容3",
            source_message_id: null,
            contextual_quote: null,
            richness: 40,
            concern: null,
            proposal: null,
            reasoning_types: null,
          },
        ],
      });
      expect(result.opinions).toHaveLength(3);
    });

    it("4件以上を拒否する", () => {
      const result = interviewReportSchema.safeParse({
        ...validReport,
        opinions: [
          { title: "意見1", content: "内容1", source_message_id: null },
          { title: "意見2", content: "内容2", source_message_id: null },
          { title: "意見3", content: "内容3", source_message_id: null },
          { title: "意見4", content: "内容4", source_message_id: null },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("空配列を受け入れる", () => {
      const result = interviewReportSchema.parse({
        ...validReport,
        opinions: [],
      });
      expect(result.opinions).toHaveLength(0);
    });

    it("titleが欠けている場合を拒否する", () => {
      const result = interviewReportSchema.safeParse({
        ...validReport,
        opinions: [{ content: "内容のみ" }],
      });
      expect(result.success).toBe(false);
    });

    it("contentが欠けている場合を拒否する", () => {
      const result = interviewReportSchema.safeParse({
        ...validReport,
        opinions: [{ title: "タイトルのみ" }],
      });
      expect(result.success).toBe(false);
    });

    it("contextual_quote に null を許容する", () => {
      const result = interviewReportSchema.parse({
        ...validReport,
        opinions: [
          {
            title: "意見",
            content: "内容",
            source_message_id: null,
            contextual_quote: null,
            richness: 55,
            concern: null,
            proposal: null,
            reasoning_types: null,
          },
        ],
      });
      expect(result.opinions[0].contextual_quote).toBeNull();
    });

    it("全フィールドが丸められてパースされる", () => {
      const result = interviewReportSchema.parse({
        ...validReport,
        content_richness: {
          total: 85.4,
          clarity: 72.6,
          specificity: 65.5,
          impact: 55.1,
          constructiveness: 45.9,
          reasoning: "小数テスト",
        },
      });
      expect(result.content_richness.total).toBe(85);
      expect(result.content_richness.clarity).toBe(73);
      expect(result.content_richness.specificity).toBe(66);
      expect(result.content_richness.impact).toBe(55);
      expect(result.content_richness.constructiveness).toBe(46);
      expect(result.content_richness.reasoning).toBe("小数テスト");
    });
  });

  it("必須フィールドが欠けている場合を拒否する", () => {
    const result = interviewReportSchema.safeParse({
      summary: "テスト",
    });
    expect(result.success).toBe(false);
  });
});

describe("interviewStageSchema", () => {
  it.each([
    "chat",
    "summary",
    "summary_complete",
  ])("%s を受け入れる", (value) => {
    const result = interviewStageSchema.parse(value);
    expect(result).toBe(value);
  });

  it("無効な値を拒否する", () => {
    const result = interviewStageSchema.safeParse("invalid");
    expect(result.success).toBe(false);
  });

  it("空文字列を拒否する", () => {
    const result = interviewStageSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

const validReportWithExtras = {
  ...validReport,
  topic_depth: [
    {
      topic: "ふだんの場面",
      situation: "concrete" as const,
      life_impact: true,
      reason_depth: "C" as const,
      desired_state: null,
    },
  ],
  dk: [{ topic: "全体の受け止め", kind: "ambivalent" as const }],
  emergent_topics: ["駐車場が少ない"],
  side_requests: [],
};

const validChatText = {
  question_id: "Q1",
  topic_title: "関わり",
  text: "こんにちは",
  end_request: false,
  personal_request: false,
  off_topic: false,
};

describe("interviewChatTextSchema", () => {
  it("本文と制御フラグをパースできる", () => {
    expect(interviewChatTextSchema.parse(validChatText)).toEqual(validChatText);
  });

  it("question_id を先頭に置く（本文のストリーミングを妨げない順）", () => {
    expect(Object.keys(interviewChatTextSchema.shape)[0]).toBe("question_id");
  });

  it("制御フラグが欠けている場合を拒否する", () => {
    const { end_request: _, ...withoutFlag } = validChatText;
    expect(interviewChatTextSchema.safeParse(withoutFlag).success).toBe(false);
  });

  it("text が欠けている場合を拒否する", () => {
    const { text: _, ...withoutText } = validChatText;
    expect(interviewChatTextSchema.safeParse(withoutText).success).toBe(false);
  });
});

describe("interviewChatWithReportSchema", () => {
  it("text, summary_response, report をパースできる", () => {
    const result = interviewChatWithReportSchema.parse({
      text: "まとめです",
      summary_response: "none",
      report: validReportWithExtras,
    });
    expect(result.report?.summary).toBe(validReport.summary);
    expect(result.report?.emergent_topics).toEqual(["駐車場が少ない"]);
  });

  it("インタビューに戻るときの report は null を許容する", () => {
    const result = interviewChatWithReportSchema.parse({
      text: "続けてどうぞ。",
      summary_response: "resume",
      report: null,
    });
    expect(result.report).toBeNull();
  });

  it("未知の summary_response を拒否する", () => {
    const result = interviewChatWithReportSchema.safeParse({
      text: "テスト",
      summary_response: "maybe",
      report: null,
    });
    expect(result.success).toBe(false);
  });

  it("text が欠けている場合を拒否する", () => {
    const result = interviewChatWithReportSchema.safeParse({
      summary_response: "agree",
      report: validReportWithExtras,
    });
    expect(result.success).toBe(false);
  });
});

describe("interviewChatResponseSchema", () => {
  it("最小限のデータ (text のみ) をパースできる", () => {
    const result = interviewChatResponseSchema.parse({ text: "テスト" });
    expect(result.text).toBe("テスト");
    expect(result.report).toBeUndefined();
    expect(result.quick_replies).toBeUndefined();
    expect(result.question_id).toBeUndefined();
    expect(result.topic_title).toBeUndefined();
    expect(result.next_stage).toBeUndefined();
  });

  it("全フィールド指定でパースできる", () => {
    const data = {
      text: "テスト",
      report: validReportWithExtras,
      quick_replies: ["選択肢1"],
      question_id: "q1",
      topic_title: "トピック",
      next_stage: "summary" as const,
    };
    const result = interviewChatResponseSchema.parse(data);
    expect(result.text).toBe("テスト");
    expect(result.report?.summary).toBe(validReport.summary);
    expect(result.quick_replies).toEqual(["選択肢1"]);
    expect(result.question_id).toBe("q1");
    expect(result.topic_title).toBe("トピック");
    expect(result.next_stage).toBe("summary");
  });

  it("report が optional かつ nullable であること", () => {
    const withNull = interviewChatResponseSchema.parse({
      text: "テスト",
      report: null,
    });
    expect(withNull.report).toBeNull();

    const withoutField = interviewChatResponseSchema.parse({
      text: "テスト",
    });
    expect(withoutField.report).toBeUndefined();
  });

  it("quick_replies が optional かつ nullable であること", () => {
    const withNull = interviewChatResponseSchema.parse({
      text: "テスト",
      quick_replies: null,
    });
    expect(withNull.quick_replies).toBeNull();

    const withoutField = interviewChatResponseSchema.parse({ text: "テスト" });
    expect(withoutField.quick_replies).toBeUndefined();
  });

  it("question_id が optional かつ nullable であること", () => {
    const withNull = interviewChatResponseSchema.parse({
      text: "テスト",
      question_id: null,
    });
    expect(withNull.question_id).toBeNull();

    const withoutField = interviewChatResponseSchema.parse({ text: "テスト" });
    expect(withoutField.question_id).toBeUndefined();
  });

  it("topic_title が optional かつ nullable であること", () => {
    const withNull = interviewChatResponseSchema.parse({
      text: "テスト",
      topic_title: null,
    });
    expect(withNull.topic_title).toBeNull();

    const withoutField = interviewChatResponseSchema.parse({ text: "テスト" });
    expect(withoutField.topic_title).toBeUndefined();
  });

  it("next_stage が optional であること", () => {
    const result = interviewChatResponseSchema.parse({ text: "テスト" });
    expect(result.next_stage).toBeUndefined();
  });

  it("text が欠けている場合を拒否する", () => {
    const result = interviewChatResponseSchema.safeParse({
      quick_replies: [],
    });
    expect(result.success).toBe(false);
  });
});
