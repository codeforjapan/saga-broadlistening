import { describe, expect, it } from "vitest";
import { SKIP_QUESTION_REPLY } from "./constants";
import { getPurposeTemplateSteps } from "./purpose-types/registry";
import {
  type AssistantTurnMeta,
  buildTurnTopics,
  computeSummaryState,
  computeTurnState,
  countQuestionTurns,
  countSummaryTurns,
  decideSummaryEntry,
  hasUsedResume,
  normalizeQuestionId,
  RESUME_TOPIC_ID,
  resolveChatTurn,
  resolveSummaryPhase,
  resolveSummaryTurn,
  type TurnTopic,
} from "./turn-control";

/** 確かめる×施策（Q1 関わり1 / Q2 場面3 / Q3 変化4 / Q4 受け止め3 / Q5 言い足し1） */
function verifyBillTopics(): TurnTopic[] {
  return buildTurnTopics(
    getPurposeTemplateSteps("verify", "bill").map((s, i) => ({
      id: `q${i + 1}`,
      ...s,
    }))
  );
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
  it("並び順に Q番号を振り、予算と観点を持つ", () => {
    const topics = verifyBillTopics();
    expect(topics.map((t) => t.label)).toEqual(["Q1", "Q2", "Q3", "Q4", "Q5"]);
    expect(topics[2].turnBudget).toBe(4);
    expect(topics[2].followUpGuide).toContain("案のどの部分");
  });

  it("予算が未設定の質問は既定の予算にする", () => {
    const [topic] = buildTurnTopics([
      { id: "a", question: "どう思いますか？", follow_up_guide: " 理由 " },
    ]);
    expect(topic).toMatchObject({
      label: "Q1",
      turnBudget: 3,
      followUpGuide: "理由",
      predefined: true,
    });
  });

  it("予算は1〜4に丸める", () => {
    const topics = buildTurnTopics([
      { id: "a", question: "a", turn_budget: 9 },
      { id: "b", question: "b", turn_budget: 0 },
    ]);
    expect(topics.map((t) => t.turnBudget)).toEqual([4, 1]);
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
  it("同じ話題の発話数を予算から引く（最初の発話を Q1 の1回目として数える）", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q3", "q3"),
    });
    expect(state.questionTurn).toBe(3);
    expect(state.remainingQuestionTurns).toBe(17);
    expect(state.current?.id).toBe("q3");
    expect(state.left).toBe(2);
    expect(state.next?.id).toBe("q4");
    expect(state.remainingTopics.map((t) => t.id)).toEqual(["q4", "q5"]);
  });

  it("予算を使い切ったら left は 0", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q2", "q2"),
    });
    expect(state.left).toBe(0);
    expect(state.next?.id).toBe("q3");
  });

  it("残りの質問の発話が残りの話題の数を超えていれば、いまの話題を続けられる", () => {
    // 質問の発話は17回。残り3（今回を含む）で、残りの話題は Q4・Q5 の2つ
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", ...Array<null>(15).fill(null), "q3"),
    });
    expect(state.remainingQuestionTurns).toBe(3);
    expect(state.left).toBe(3);
  });

  it("残りの質問の発話が残りの話題の数以下なら、いまの話題を打ち切る", () => {
    // 質問の発話は18回。残り2で、残りの話題 Q4・Q5 に1回ずつ回す
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", ...Array<null>(16).fill(null), "q3"),
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
    expect(state.remainingQuestionTurns).toBe(19);
  });

  it("終了を求めて飛ばした話題は、再開後の予算計算に数えない", () => {
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

  it("質問の発話が20回に達したら要約に入る（最初の発話は数えない）", () => {
    const at19 = computeTurnState({
      topics,
      metas: afterQuestionTurns(19, "q3"),
    });
    expect(at19.questionTurn).toBe(19);
    expect(decideSummaryEntry({ state: at19, endButton: false })).toBe(false);

    const at20 = computeTurnState({
      topics,
      metas: afterQuestionTurns(20, "q3"),
    });
    expect(decideSummaryEntry({ state: at20, endButton: false })).toBe(true);
  });

  it("言い足しまで聞き終えたら要約に入る", () => {
    const state = computeTurnState({
      topics,
      metas: metas("q1", "q2", "q3", "q4", "q5"),
    });
    expect(decideSummaryEntry({ state, endButton: false })).toBe(true);
  });

  it("話題が残っていれば続ける", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    expect(decideSummaryEntry({ state, endButton: false })).toBe(false);
  });
});

describe("normalizeQuestionId", () => {
  const topics = verifyBillTopics();

  it("予算が残っていれば、いまの話題か次の話題をそのまま使う", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    expect(normalizeQuestionId("Q2", state)?.id).toBe("q2");
    expect(normalizeQuestionId("Q3", state)?.id).toBe("q3");
  });

  it("いま・次以外の ID は、いまの話題に読み替える", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    expect(normalizeQuestionId("Q5", state)?.id).toBe("q2");
    expect(normalizeQuestionId(undefined, state)?.id).toBe("q2");
  });

  it("予算が0なのにいまの話題を返したら、次の話題に進んだものとする", () => {
    const state = computeTurnState({
      topics,
      metas: metas("q1", "q2", "q2", "q2"),
    });
    expect(normalizeQuestionId("Q2", state)?.id).toBe("q3");
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

  it("同じ話題を続ける発話には選択肢を付けない", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    const result = resolveChatTurn({ state, rawQuestionId: "Q2" });
    expect(result.quickReplies).toEqual([]);
  });
});

describe("要約の段階", () => {
  it("初回の要約の後は返事を待つ", () => {
    const state = computeSummaryState({
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
      metas: [...metas("q1", "q2"), ...summaryMetas(1)],
      phase: "reply",
      forceClose: false,
    });
    expect(resolveSummaryTurn(state, "agree").stage).toBe("summary_complete");
  });

  it("要約の段階の残りが3回以上あれば、1回だけインタビューに戻れる", () => {
    const state = computeSummaryState({
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
      metas: [...afterQuestionTurns(20), ...summaryMetas(1)],
      phase: "reply",
      forceClose: false,
    });
    expect(state.canResume).toBe(false);

    const oneLeft = computeSummaryState({
      metas: [...afterQuestionTurns(19), ...summaryMetas(1)],
      phase: "reply",
      forceClose: false,
    });
    expect(oneLeft.canResume).toBe(true);
  });

  it("要約の段階の残りが1回なら、どの返事でも締める", () => {
    const state = computeSummaryState({
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
      metas: [...metas("q1", "q2"), ...summaryMetas(1)],
      phase: "first",
      forceClose: true,
    });
    expect(resolveSummaryTurn(state, "none").stage).toBe("summary_complete");
  });
});
