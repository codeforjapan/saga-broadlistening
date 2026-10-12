import { describe, expect, it } from "vitest";
import { SKIP_QUESTION_REPLY } from "./constants";
import { getPurposeTemplateSteps } from "./purpose-types/registry";
import {
  type AssistantTurnMeta,
  buildTurnTopics,
  computeSummaryState,
  computeTurnState,
  decideSummaryEntry,
  normalizeQuestionId,
  RESUME_TOPIC_ID,
  resolveChatTurn,
  resolveSummaryTurn,
  type TurnTopic,
} from "./turn-control";

/** 確かめる×施策（Q1 関わり1 / Q2 場面3 / Q3 変化4 / Q4 受け止め3 / Q5 言い足し1） */
function verifyBillTopics(): TurnTopic[] {
  const questions = getPurposeTemplateSteps("verify", "bill").map((s, i) => ({
    id: `q${i + 1}`,
    ...s,
  }));
  return buildTurnTopics(questions, { purposeType: "verify", subject: "bill" });
}

/** 描く×テーマ（Q5 が任意） */
function envisionThemeTopics(): TurnTopic[] {
  const questions = getPurposeTemplateSteps("envision", "theme").map(
    (s, i) => ({ id: `q${i + 1}`, ...s })
  );
  return buildTurnTopics(questions, {
    purposeType: "envision",
    subject: "theme",
  });
}

function metas(...ids: (string | null)[]): AssistantTurnMeta[] {
  return ids.map((questionId) => ({ questionId, budgetExempt: false }));
}

describe("buildTurnTopics", () => {
  it("テンプレートの step_key から話題名を引き、Q番号を振る", () => {
    const topics = verifyBillTopics();
    expect(topics.map((t) => t.label)).toEqual(["Q1", "Q2", "Q3", "Q4", "Q5"]);
    expect(topics[2].title).toBe("案による変化");
    expect(topics[2].turnBudget).toBe(4);
  });

  it("目的が未設定の質問は既定の予算・必須・場面として扱う", () => {
    const [topic] = buildTurnTopics(
      [{ id: "a", question: "どう思いますか？", hint: "理由" }],
      { purposeType: null, subject: "theme" }
    );
    expect(topic).toMatchObject({
      title: "質問1",
      kind: "episode",
      turnBudget: 3,
      required: true,
      hint: "理由",
    });
  });

  it("予算は1〜4に丸める", () => {
    const topics = buildTurnTopics(
      [
        { id: "a", question: "a", turn_budget: 9 },
        { id: "b", question: "b", turn_budget: 0 },
      ],
      { purposeType: null, subject: "theme" }
    );
    expect(topics.map((t) => t.turnBudget)).toEqual([4, 1]);
  });
});

describe("computeTurnState", () => {
  it("同じ話題の発話数を予算から引く（最初の質問を含む）", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q3", "q3"),
    });
    expect(state.current?.id).toBe("q3");
    expect(state.left).toBe(2);
    expect(state.next?.id).toBe("q4");
    expect(state.remainingRequired.map((t) => t.id)).toEqual(["q4", "q5"]);
  });

  it("予算を使い切ったら left は 0", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q2", "q2"),
    });
    expect(state.left).toBe(0);
    expect(state.next?.id).toBe("q3");
  });

  it("予算から除いた発話（個別の要望・テーマ外）は数えない", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: [
        ...metas("q1", "q2", "q2"),
        { questionId: "q2", budgetExempt: true },
      ],
    });
    expect(state.left).toBe(1);
  });

  it("残りの発話が必須の話題に足りなくなったら、いまの話題を打ち切る", () => {
    // 15回話して残り5。要約に3残すと、残り2つの必須の話題で手一杯になる
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas(
        "q1",
        "q2",
        "q2",
        "q2",
        "q3",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        "q3"
      ),
    });
    expect(state.remainingTurns).toBe(5);
    expect(state.left).toBe(0);
  });

  it("任意の話題は余裕があるときだけ次の話題にする", () => {
    const roomy = computeTurnState({
      topics: envisionThemeTopics(),
      metas: metas("q1", "q2", "q3", "q4"),
    });
    expect(roomy.next?.id).toBe("q5");
    expect(roomy.pendingOptional.map((t) => t.id)).toEqual(["q5"]);

    // 残り7（=20-13）。要約の3を引いて4、必須の残りは1つ（q6）。4 > 1+1 なので入れる
    // 残り5のときは 2 > 2 を満たさず飛ばす
    const tight = computeTurnState({
      topics: envisionThemeTopics(),
      metas: metas(
        "q1",
        "q2",
        "q2",
        "q2",
        "q2",
        "q3",
        "q3",
        "q3",
        "q3",
        "q4",
        "q4",
        "q4",
        null,
        null,
        null
      ),
    });
    expect(tight.remainingTurns).toBe(5);
    expect(tight.next?.id).toBe("q6");
  });

  it("飛ばした任意の話題には後から戻らない", () => {
    const state = computeTurnState({
      topics: envisionThemeTopics(),
      metas: metas("q1", "q2", "q3", "q4", "q6"),
    });
    expect(state.current?.id).toBe("q6");
    expect(state.next).toBeNull();
  });

  it("終了を求めて飛ばした必須の話題は、再開後の予算計算に数えない", () => {
    // Q1→Q2 の後に終えたいと言われて要約へ。再開したときに Q3〜Q5 は聞けない
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", null, null, null, null, null, null, null, null, RESUME_TOPIC_ID),
    });
    expect(state.next).toBeNull();
    expect(state.left).toBe(1);
  });

  it("再開の話題の後に事前定義の話題は無い", () => {
    const state = computeTurnState({
      topics: verifyBillTopics(),
      metas: metas("q1", "q2", "q3", "q4", "q5", null, RESUME_TOPIC_ID),
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
    expect(decideSummaryEntry({ state, endButton: true })).toBe("end_button");
  });

  it("17回話したら要約に入る", () => {
    const state = computeTurnState({
      topics,
      metas: metas(...Array<string>(17).fill("q3")),
    });
    expect(decideSummaryEntry({ state, endButton: false })).toBe("turn_limit");
  });

  it("言い足しまで聞き終えたら要約に入る", () => {
    const state = computeTurnState({
      topics,
      metas: metas("q1", "q2", "q3", "q4", "q5"),
    });
    expect(decideSummaryEntry({ state, endButton: false })).toBe("completed");
  });

  it("話題が残っていれば続ける", () => {
    const state = computeTurnState({ topics, metas: metas("q1", "q2") });
    expect(decideSummaryEntry({ state, endButton: false })).toBeNull();
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
    const m = metas("q1", "q2", "q3");
    const state = computeTurnState({ topics, metas: m });
    const result = resolveChatTurn({
      state,
      metas: m,
      rawQuestionId: "Q4",
      sideTurn: false,
    });
    expect(result.questionId).toBe("q4");
    expect(result.quickReplies).toContain("まだ決められない");
    expect(result.quickReplies.at(-1)).toBe(SKIP_QUESTION_REPLY);
  });

  it("同じ話題を続ける発話には選択肢を付けない", () => {
    const m = metas("q1", "q2");
    const state = computeTurnState({ topics, metas: m });
    const result = resolveChatTurn({
      state,
      metas: m,
      rawQuestionId: "Q2",
      sideTurn: false,
    });
    expect(result.quickReplies).toEqual([]);
  });

  it("脇道の発話を予算から除けるのは話題ごとに1回まで", () => {
    const first = metas("q1", "q2");
    const state = computeTurnState({ topics, metas: first });
    expect(
      resolveChatTurn({
        state,
        metas: first,
        rawQuestionId: "Q2",
        sideTurn: true,
      }).budgetExempt
    ).toBe(true);

    const second: AssistantTurnMeta[] = [
      ...first,
      { questionId: "q2", budgetExempt: true },
    ];
    expect(
      resolveChatTurn({
        state: computeTurnState({ topics, metas: second }),
        metas: second,
        rawQuestionId: "Q2",
        sideTurn: true,
      }).budgetExempt
    ).toBe(false);
  });
});

describe("要約の段階", () => {
  it("初回の要約の後は返事を待つ", () => {
    const state = computeSummaryState({
      assistantTurn: 10,
      phase: "first",
      resumeUsed: false,
      forceClose: false,
    });
    expect(resolveSummaryTurn(state, "none")).toEqual({
      stage: "summary",
      summaryPhase: "reply",
      resumed: false,
    });
  });

  it("要約に同意したら完了する", () => {
    const state = computeSummaryState({
      assistantTurn: 11,
      phase: "reply",
      resumeUsed: false,
      forceClose: false,
    });
    expect(resolveSummaryTurn(state, "agree").stage).toBe("summary_complete");
  });

  it("残りに余裕があれば1回だけインタビューに戻れる", () => {
    const state = computeSummaryState({
      assistantTurn: 11,
      phase: "reply",
      resumeUsed: false,
      forceClose: false,
    });
    expect(state.canResume).toBe(true);
    expect(resolveSummaryTurn(state, "resume")).toEqual({
      stage: "chat",
      summaryPhase: null,
      resumed: true,
    });

    const used = computeSummaryState({
      assistantTurn: 11,
      phase: "reply",
      resumeUsed: true,
      forceClose: false,
    });
    expect(resolveSummaryTurn(used, "resume").stage).toBe("summary");
  });

  it("再開しても要約開始までに chat の発話が残らないときは戻らない", () => {
    const state = computeSummaryState({
      assistantTurn: 16,
      phase: "reply",
      resumeUsed: false,
      forceClose: false,
    });
    expect(state.canResume).toBe(false);
    expect(resolveSummaryTurn(state, "resume").stage).toBe("summary");
  });

  it("残りが1回なら、どの返事でも締める", () => {
    const state = computeSummaryState({
      assistantTurn: 19,
      phase: "reply",
      resumeUsed: false,
      forceClose: false,
    });
    expect(state.isLast).toBe(true);
    expect(resolveSummaryTurn(state, "revise").stage).toBe("summary_complete");
  });

  it("要約中に「終える」が押されたら締める", () => {
    const state = computeSummaryState({
      assistantTurn: 12,
      phase: "first",
      resumeUsed: false,
      forceClose: true,
    });
    expect(resolveSummaryTurn(state, "none").stage).toBe("summary_complete");
  });
});
