import { describe, expect, it } from "vitest";
import { SKIP_QUESTION_REPLY } from "./constants";
import { getPurposeTemplateSteps } from "./purpose-types/registry";
import {
  type AssistantTurnMeta,
  buildQuickReplies,
  buildTurnTopics,
  computeQuestionTurnLimit,
  computeSummaryState,
  computeTurnState,
  countQuestionTurns,
  countSummaryTurns,
  decideSummaryEntry,
  hasUsedResume,
  normalizeQuestionId,
  RESUME_TOPIC,
  RESUME_TOPIC_ID,
  resolveChatTurn,
  resolveSummaryPhase,
  resolveSummaryTurn,
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
  return metas("q1", "q2", ...Array<null>(20).fill(null), "q2");
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
  it("質問の発話の上限は、設定した質問の数 × 5", () => {
    expect(computeQuestionTurnLimit(verifyBillTopics())).toBe(25);
    expect(
      computeQuestionTurnLimit(
        buildTurnTopics([
          { id: "a", question: "a" },
          { id: "b", question: "b" },
          { id: "c", question: "c" },
        ])
      )
    ).toBe(15);
  });

  it("再開の話題は質問の数に含めない", () => {
    const topics = buildTurnTopics([{ id: "a", question: "a" }]);
    expect(computeQuestionTurnLimit([...topics, RESUME_TOPIC])).toBe(5);
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
    expect(countSummaryTurns(history)).toBe(3);
  });

  it("ステージの記録が無い古い発話は chat として数える", () => {
    const legacy: AssistantTurnMeta[] = [
      { questionId: "q1", stage: null },
      { questionId: "q2", stage: null },
    ];
    expect(countQuestionTurns(legacy)).toBe(1);
    expect(countSummaryTurns(legacy)).toBe(0);
  });

  it("再開の話題の発話があれば、再開は使用済み", () => {
    expect(hasUsedResume(metas("q1", "q2"))).toBe(false);
    expect(
      hasUsedResume([...metas("q1"), ...summaryMetas(1, RESUME_TOPIC_ID)])
    ).toBe(true);
  });
});

describe("resolveSummaryPhase", () => {
  it("このリクエストで要約に入ったら初回の要約", () => {
    expect(
      resolveSummaryPhase({ sessionStage: "chat", metas: metas("q1", "q2") })
    ).toBe("first");
    // 再開を受けた直後に要約へ戻るときも初回の要約
    expect(
      resolveSummaryPhase({
        sessionStage: "chat",
        metas: [...metas("q1"), ...summaryMetas(2, RESUME_TOPIC_ID)],
      })
    ).toBe("first");
  });

  it("要約の段階で、直前が要約の発話なら返事を受けるところ", () => {
    expect(
      resolveSummaryPhase({
        sessionStage: "summary",
        metas: [...metas("q1", "q2"), ...summaryMetas(1)],
      })
    ).toBe("reply");
  });

  it("終えたいと言われた直後（直前が chat の発話）なら初回の要約", () => {
    expect(
      resolveSummaryPhase({ sessionStage: "summary", metas: metas("q1", "q2") })
    ).toBe("first");
  });
});

describe("computeTurnState", () => {
  it("話題の発話を数え、全体の残りから残りの話題に1回ずつ残した分を上限にする（最初の発話を Q1 の1回目として数える）", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q3", "q3"),
    });
    expect(state.questionTurn).toBe(3);
    expect(state.questionTurnLimit).toBe(25);
    expect(state.remainingQuestionTurns).toBe(22);
    expect(state.current?.id).toBe("q3");
    expect(state.topicTurns).toBe(2);
    expect(state.topicTurnTarget).toBe(5);
    expect(state.topicTurnSoft).toBe(true);
    // 残り22から、Q4・Q5 に1回ずつ残す
    expect(state.left).toBe(20);
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
    expect(state.left).toBe(16);
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
    // 質問の発話は22回（上限25）。残り3（今回を含む）で、残りの話題は Q4・Q5 の2つ
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", ...Array<null>(20).fill(null), "q3"),
    });
    expect(state.remainingQuestionTurns).toBe(3);
    expect(state.current?.id).toBe("q3");
    expect(state.left).toBe(1);
  });

  it("残りの質問の発話が残りの話題の数以下なら、いまの話題を打ち切る", () => {
    // 質問の発話は23回（上限25）。残り2で、残りの話題 Q4・Q5 に1回ずつ回す
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", ...Array<null>(21).fill(null), "q3"),
    });
    expect(state.remainingQuestionTurns).toBe(2);
    expect(state.left).toBe(0);
    expect(state.next?.id).toBe("q4");
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
    expect(state.remainingQuestionTurns).toBe(24);
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

  it("質問の発話が上限（質問5つ × 5 = 25回）に達したら要約に入る（最初の発話は数えない）", () => {
    const at24 = computeTurnState({
      topics,
      metas: afterQuestionTurns(24, "q3"),
    });
    expect(at24.questionTurn).toBe(24);
    expect(decideSummaryEntry({ state: at24, endButton: false })).toBe(false);

    const at25 = computeTurnState({
      topics,
      metas: afterQuestionTurns(25, "q3"),
    });
    expect(decideSummaryEntry({ state: at25, endButton: false })).toBe(true);
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

describe("要約の段階", () => {
  it("初回の要約の後は返事を待つ", () => {
    const state = computeSummaryState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q3"),
      phase: "first",
      forceClose: false,
    });
    expect(state.remainingTurns).toBe(5);
    expect(resolveSummaryTurn(state, "none")).toEqual({
      stage: "summary",
      resumed: false,
    });
  });

  it("要約に同意したら完了する", () => {
    const state = computeSummaryState({
      topics: verifyBillTopics(),
      metas: [...metas("q1", "q2"), ...summaryMetas(1)],
      phase: "reply",
      forceClose: false,
    });
    expect(resolveSummaryTurn(state, "agree").stage).toBe("summary_complete");
  });

  it("要約の段階の残りが3回以上あれば、1回だけインタビューに戻れる", () => {
    const state = computeSummaryState({
      topics: verifyBillTopics(),
      metas: [...metas("q1", "q2"), ...summaryMetas(2)],
      phase: "reply",
      forceClose: false,
    });
    expect(state.remainingTurns).toBe(3);
    expect(state.canResume).toBe(true);
    expect(resolveSummaryTurn(state, "resume")).toEqual({
      stage: "chat",
      resumed: true,
    });
  });

  it("要約の段階の残りが2回なら戻らない", () => {
    const state = computeSummaryState({
      topics: verifyBillTopics(),
      metas: [...metas("q1", "q2"), ...summaryMetas(3)],
      phase: "reply",
      forceClose: false,
    });
    expect(state.remainingTurns).toBe(2);
    expect(state.canResume).toBe(false);
    expect(resolveSummaryTurn(state, "resume").stage).toBe("summary");
  });

  it("再開を使った後は戻らない", () => {
    const state = computeSummaryState({
      topics: verifyBillTopics(),
      metas: [
        ...metas("q1", "q2"),
        ...summaryMetas(1, RESUME_TOPIC_ID),
        ...metas(RESUME_TOPIC_ID),
      ],
      phase: "reply",
      forceClose: false,
    });
    expect(state.canResume).toBe(false);
  });

  it("質問の発話が上限に達していれば戻らない", () => {
    const state = computeSummaryState({
      topics: verifyBillTopics(),
      metas: [...afterQuestionTurns(25), ...summaryMetas(1)],
      phase: "reply",
      forceClose: false,
    });
    expect(state.canResume).toBe(false);

    const oneLeft = computeSummaryState({
      topics: verifyBillTopics(),
      metas: [...afterQuestionTurns(24), ...summaryMetas(1)],
      phase: "reply",
      forceClose: false,
    });
    expect(oneLeft.canResume).toBe(true);
  });

  it("要約の段階の残りが1回なら、どの返事でも締める", () => {
    const state = computeSummaryState({
      topics: verifyBillTopics(),
      metas: [...metas("q1", "q2"), ...summaryMetas(4)],
      phase: "reply",
      forceClose: false,
    });
    expect(state.remainingTurns).toBe(1);
    expect(state.isLast).toBe(true);
    expect(resolveSummaryTurn(state, "revise").stage).toBe("summary_complete");
  });

  it("要約中に「終える」が押されたら締める", () => {
    const state = computeSummaryState({
      topics: verifyBillTopics(),
      metas: [...metas("q1", "q2"), ...summaryMetas(1)],
      phase: "first",
      forceClose: true,
    });
    expect(resolveSummaryTurn(state, "none").stage).toBe("summary_complete");
  });
});
