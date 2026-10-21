import { describe, expect, it } from "vitest";
import { SKIP_QUESTION_REPLY } from "./constants";
import { getPurposeTemplateSteps } from "./purpose-types/registry";
import {
  type AssistantTurnMeta,
  buildQuickReplies,
  buildTurnTopics,
  computeQuestionTurnLimit,
  computeTurnState,
  countQuestionTurns,
  decideSummaryEntry,
  normalizeQuestionId,
  RESUME_TOPIC,
  RESUME_TOPIC_ID,
  resolveChatTurn,
  type TurnTopic,
  topicTurnTarget,
} from "./turn-control";

/** 確かめる×施策（Q1 関わり / Q2 場面 / Q3 変化 / Q4 受け止め / Q5 言い足し。どの話題も発話5回が目安） */
function verifyBillTopics(): TurnTopic[] {
  return buildTurnTopics(
    getPurposeTemplateSteps("verify", "bill").map((s, i) => ({
      id: `q${i + 1}`,
      ...s,
    }))
  );
}

/** Q2 を聞いている途中で、全体の残りが残りの話題（Q3〜Q5）の数まで減った発話の記録 */
function exhaustedQ2(): AssistantTurnMeta[] {
  return metas("q1", "q2", ...Array<null>(45).fill(null), "q2");
}

/** chat ステージの発話（先頭は最初の発話） */
function metas(...ids: (string | null)[]): AssistantTurnMeta[] {
  return ids.map((questionId) => ({
    questionId,
    stage: "chat",
  }));
}

/** 要約の段階の発話 */
function summaryMetas(count: number, questionId: string | null = null) {
  return Array.from(
    { length: count },
    (): AssistantTurnMeta => ({ questionId, stage: "summary" })
  );
}

/** 最初の発話（Q1）の後に、質問の発話を n 回した履歴 */
function afterQuestionTurns(n: number, id: string | null = null) {
  return metas("q1", ...Array<string | null>(n).fill(id));
}

describe("buildTurnTopics", () => {
  it("並び順に Q番号を振り、観点を持つ", () => {
    const topics = verifyBillTopics();
    expect(topics.map((t) => t.label)).toEqual(["Q1", "Q2", "Q3", "Q4", "Q5"]);
    expect(topics[2].followUpGuide).toContain("案のどの部分");
  });

  it("観点の前後の空白を除き、事前定義の話題にする", () => {
    const [topic] = buildTurnTopics([
      { id: "a", question: "どう思いますか？", follow_up_guide: " 理由 " },
    ]);
    expect(topic).toMatchObject({
      label: "Q1",
      followUpGuide: "理由",
      predefined: true,
    });
  });
});

describe("topicTurnTarget", () => {
  it("設定した質問はどれも発話5回が目安、再開の話題は2回", () => {
    const [topic] = buildTurnTopics([{ id: "a", question: "a" }]);
    expect(topicTurnTarget(topic)).toBe(5);
    expect(topicTurnTarget(RESUME_TOPIC)).toBe(2);
  });
});

describe("computeQuestionTurnLimit", () => {
  it("質問の発話の上限は、設定した質問の数 × 10", () => {
    expect(computeQuestionTurnLimit(verifyBillTopics())).toBe(50);
    expect(
      computeQuestionTurnLimit(
        buildTurnTopics([
          { id: "a", question: "a" },
          { id: "b", question: "b" },
          { id: "c", question: "c" },
        ])
      )
    ).toBe(30);
  });

  it("再開の話題は質問の数に含めない", () => {
    const topics = buildTurnTopics([{ id: "a", question: "a" }]);
    expect(computeQuestionTurnLimit([...topics, RESUME_TOPIC])).toBe(10);
  });

  it("質問がなければ上限は0（すぐに要約へ入る）", () => {
    expect(computeQuestionTurnLimit([])).toBe(0);
  });
});

describe("発話の数え方", () => {
  it("質問の発話は、最初の発話と要約の段階の発話を数えない", () => {
    const history = [
      ...metas("q1", "q2", "q2"),
      ...summaryMetas(2),
      ...summaryMetas(1, RESUME_TOPIC_ID),
      ...metas(RESUME_TOPIC_ID),
    ];
    expect(countQuestionTurns(history)).toBe(3);
  });

  it("ステージの記録が無い古い発話は chat として数える", () => {
    const legacy: AssistantTurnMeta[] = [
      { questionId: "q1", stage: null },
      { questionId: "q2", stage: null },
    ];
    expect(countQuestionTurns(legacy)).toBe(1);
  });
});

describe("computeTurnState", () => {
  it("話題の発話を数え、全体の残りから残りの話題に1回ずつ残した分を上限にする（最初の発話を Q1 の1回目として数える）", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q3", "q3"),
    });
    expect(state.questionTurn).toBe(3);
    expect(state.questionTurnLimit).toBe(50);
    expect(state.remainingQuestionTurns).toBe(47);
    expect(state.current?.id).toBe("q3");
    expect(state.topicTurns).toBe(2);
    expect(state.topicTurnTarget).toBe(5);
    expect(state.topicTurnSoft).toBe(true);
    // 残り47から、Q4・Q5 に1回ずつ残す
    expect(state.left).toBe(45);
    expect(state.next?.id).toBe("q4");
    expect(state.remainingTopics.map((t) => t.id)).toEqual(["q4", "q5"]);
  });

  it("最初の話題の後は、最後の話題を除くまだ聞いていない話題のどれからでも聞ける", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1"),
    });
    expect(state.candidates.map((t) => t.id)).toEqual(["q2", "q3", "q4"]);
    expect(state.next?.id).toBe("q2");
    expect(state.remainingTopics.map((t) => t.id)).toEqual([
      "q2",
      "q3",
      "q4",
      "q5",
    ]);
  });

  it("先に聞いた話題を飛ばした話題も、後から聞ける", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q3"),
    });
    expect(state.current?.id).toBe("q3");
    expect(state.candidates.map((t) => t.id)).toEqual(["q2", "q4"]);
  });

  it("最後の話題は、ほかの話題を聞き終えてから聞ける", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q3", "q2", "q4"),
    });
    expect(state.candidates.map((t) => t.id)).toEqual(["q5"]);
    expect(state.remainingTopics.map((t) => t.id)).toEqual(["q5"]);
  });

  it("話題が2つなら、最初の話題の後は最後の話題だけが候補", () => {
    const state = computeTurnState({
      topics: verifyBillTopics().slice(0, 2),
      metas: metas("q1"),
    });
    expect(state.candidates.map((t) => t.id)).toEqual(["q2"]);
  });

  it("話題が1つなら、候補はなく、使い切ったら要約に入る", () => {
    const state = computeTurnState({
      topics: verifyBillTopics().slice(0, 1),
      metas: metas("q1", "q1", "q1", "q1", "q1"),
    });
    expect(state.candidates).toEqual([]);
    expect(decideSummaryEntry({ state, endButton: false })).toBe(true);
  });

  it("次へ移れる話題は、目安の5回を超えても続けられる", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q2", "q2", "q2", "q2", "q2"),
    });
    expect(state.topicTurns).toBe(6);
    expect(state.topicTurnSoft).toBe(true);
    expect(state.left).toBe(41);
    expect(state.next?.id).toBe("q3");
  });

  it("最後の話題は次へ移れないので、目安の5回が上限", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q3", "q4", "q5", "q5"),
    });
    expect(state.topicTurnSoft).toBe(false);
    expect(state.left).toBe(3);
  });

  it("残りの質問の発話が残りの話題の数を超えていれば、いまの話題を続けられる", () => {
    // 質問の発話は47回（上限50）。残り3（今回を含む）で、残りの話題は Q4・Q5 の2つ
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", ...Array<null>(45).fill(null), "q3"),
    });
    expect(state.remainingQuestionTurns).toBe(3);
    expect(state.current?.id).toBe("q3");
    expect(state.left).toBe(1);
  });

  it("残りの質問の発話が残りの話題の数以下なら、いまの話題を打ち切る", () => {
    // 質問の発話は48回（上限50）。残り2で、残りの話題 Q4・Q5 に1回ずつ回す
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", ...Array<null>(46).fill(null), "q3"),
    });
    expect(state.remainingQuestionTurns).toBe(2);
    expect(state.left).toBe(0);
    expect(state.next?.id).toBe("q4");
  });

  it("question_id のない古い発話は、全体の上限だけを消費し、話題の回数には数えない", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", null, null, "q2"),
    });
    expect(state.questionTurn).toBe(3);
    expect(state.current?.id).toBe("q2");
    expect(state.topicTurns).toBe(1);
    expect(state.left).toBe(44);
  });

  it("要約の段階の発話は、質問の発話の残りを減らさない", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: [
        ...metas("q1", "q2"),
        ...summaryMetas(1),
        ...summaryMetas(1, RESUME_TOPIC_ID),
      ],
    });
    expect(state.questionTurn).toBe(1);
    expect(state.remainingQuestionTurns).toBe(49);
  });

  it("終了を求めて飛ばした話題は、再開後の発話の上限の計算に数えない", () => {
    // Q1→Q2 の後に終えたいと言われて要約へ。再開したときに Q3〜Q5 は聞けない
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: [
        ...metas("q1", "q2"),
        ...summaryMetas(1),
        ...summaryMetas(1, RESUME_TOPIC_ID),
      ],
    });
    expect(state.current?.id).toBe(RESUME_TOPIC_ID);
    expect(state.next).toBeNull();
    expect(state.left).toBe(1);
  });

  it("再開の話題の後に事前定義の話題は無い", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: [
        ...metas("q1", "q2", "q3", "q4", "q5"),
        ...summaryMetas(2),
        ...summaryMetas(1, RESUME_TOPIC_ID),
      ],
    });
    expect(state.current?.id).toBe(RESUME_TOPIC_ID);
    expect(state.left).toBe(1);
    expect(state.next).toBeNull();
  });
});

describe("decideSummaryEntry", () => {
  const topics = verifyBillTopics();

  it("「終える」ボタンで要約に入る", () => {
    const state = computeTurnState({ topics, metas: metas("q1") });
    expect(decideSummaryEntry({ state, endButton: true })).toBe(true);
  });

  it("質問の発話が上限（質問5つ × 10 = 50回）に達したら要約に入る（最初の発話は数えない）", () => {
    const at49 = computeTurnState({
      topics,
      metas: afterQuestionTurns(49, "q3"),
    });
    expect(at49.questionTurn).toBe(49);
    expect(decideSummaryEntry({ state: at49, endButton: false })).toBe(false);

    const at50 = computeTurnState({
      topics,
      metas: afterQuestionTurns(50, "q3"),
    });
    expect(decideSummaryEntry({ state: at50, endButton: false })).toBe(true);
  });

  it("最後の話題の発話の上限を使い切ったら要約に入る", () => {
    const state = computeTurnState({
      topics,
      metas: metas("q1", "q2", "q3", "q4", "q5", "q5", "q5", "q5", "q5"),
    });
    expect(decideSummaryEntry({ state, endButton: false })).toBe(true);
  });

  it("最後の話題に発話が残っていれば、まだ要約に入らない", () => {
    const state = computeTurnState({
      topics,
      metas: metas("q1", "q2", "q3", "q4", "q5"),
    });
    expect(state.left).toBe(4);
    expect(decideSummaryEntry({ state, endButton: false })).toBe(false);
  });

  it("質問が0件の構成では、最初の返事のあとすぐ要約に入る", () => {
    const state = computeTurnState({ topics: [], metas: metas(null) });
    expect(state.questionTurnLimit).toBe(0);
    expect(state.current).toBeNull();
    expect(decideSummaryEntry({ state, endButton: false })).toBe(true);
  });

  it("話題が残っていれば続ける", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    expect(decideSummaryEntry({ state, endButton: false })).toBe(false);
  });
});

describe("normalizeQuestionId", () => {
  const topics = verifyBillTopics();

  it("発話が残っていれば、いまの話題か次に聞ける話題をそのまま使う", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    expect(normalizeQuestionId("Q2", state)?.id).toBe("q2");
    expect(normalizeQuestionId("Q3", state)?.id).toBe("q3");
    expect(normalizeQuestionId("q4", state)?.id).toBe("q4");
  });

  it("次に聞けない ID（ほかを聞き終える前の最後の話題など）は、いまの話題に読み替える", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    expect(normalizeQuestionId("Q5", state)?.id).toBe("q2");
    expect(normalizeQuestionId(undefined, state)?.id).toBe("q2");
  });

  it("発話が0なのにいまの話題を返したら、次の話題に進んだものとする", () => {
    const state = computeTurnState({
      topics,
      metas: exhaustedQ2(),
    });
    expect(normalizeQuestionId("Q2", state)?.id).toBe("q3");
  });

  it("発話が0のときも、選んだ次の話題があればそれを使う", () => {
    const state = computeTurnState({
      topics,
      metas: exhaustedQ2(),
    });
    expect(normalizeQuestionId("Q4", state)?.id).toBe("q4");
  });
});

describe("resolveChatTurn", () => {
  const topics = verifyBillTopics();

  it("初めて聞く質問には選択肢と「とばす」を付ける", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2", "q3") });
    const result = resolveChatTurn({ state, rawQuestionId: "Q4" });
    expect(result.questionId).toBe("q4");
    // 受け止めの選択肢はテンプレートのデータに「まだ決められない」を含む
    expect(result.quickReplies).toEqual([
      "賛成",
      "どちらかといえば賛成",
      "どちらかといえば反対",
      "反対",
      "まだ決められない",
      SKIP_QUESTION_REPLY,
    ]);
  });

  it("並びで次ではない話題に移っても、その話題の選択肢を付ける", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    const result = resolveChatTurn({ state, rawQuestionId: "Q4" });
    expect(result.questionId).toBe("q4");
    expect(result.quickReplies).toEqual(
      buildQuickReplies(topics[3] as TurnTopic)
    );
  });

  it("発話が0で次の話題を ID で示さなかったら、候補の先頭として記録し選択肢は付けない", () => {
    const state = computeTurnState({
      topics,
      metas: exhaustedQ2(),
    });
    const result = resolveChatTurn({ state, rawQuestionId: "Q5" });
    expect(result.questionId).toBe("q3");
    expect(result.quickReplies).toEqual([]);
  });

  it("同じ話題を続ける発話には選択肢を付けない", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    const result = resolveChatTurn({ state, rawQuestionId: "Q2" });
    expect(result.quickReplies).toEqual([]);
  });
});
