import { describe, expect, it } from "vitest";
import { getPurposeTemplateSteps } from "./purpose-types/registry";
import {
  buildTurnTopics,
  computeTurnState,
  RESUME_TOPIC_ID,
} from "./turn-control";
import {
  renderChatOutputInstructions,
  renderSummaryState,
  renderTurnState,
} from "./turn-state";

const topics = buildTurnTopics(
  getPurposeTemplateSteps("envision", "theme").map((s, i) => ({
    id: `q${i + 1}`,
    ...s,
  })),
  { purposeType: "envision", subject: "theme" }
);

function stateAfter(...ids: string[]) {
  return computeTurnState({
    topics,
    metas: ids.map((questionId) => ({ questionId, budgetExempt: false })),
  });
}

describe("renderTurnState", () => {
  it("予算が残っていれば続けても移ってもよいと書く", () => {
    const text = renderTurnState(stateAfter("q1", "q2"), { piiNotice: null });
    expect(text).toContain(
      "- いまの話題：Q2「よかった場面」（場面）。この話題で使える発話：あと3回（今回を含む）"
    );
    expect(text).toContain("- 続けても、次の話題に移ってもよい");
    expect(text).toContain(
      "- 次の話題：Q3「10年後の一日」（選択肢ボタンはシステムが出す）"
    );
    expect(text).toContain(
      "- 残りの話題：Q3・Q4・Q6（あと3つ。Q5 は残りの発話数によってシステムが決める）"
    );
    expect(text).not.toContain("伏せ字の案内");
  });

  it("予算を使い切ったら次の話題へ移るよう指示する", () => {
    const text = renderTurnState(
      stateAfter("q1", "q2", "q2", "q2", "q2"),
      { piiNotice: "done" }
    );
    expect(text).toContain("あと0回");
    expect(text).toContain("- 今回は次の話題に移る（question_id は Q3）");
    expect(text).toContain("- 伏せ字の案内：済み");
  });

  it("最後の必須の話題には「最後の質問」と書く", () => {
    const text = renderTurnState(stateAfter("q1", "q2", "q3", "q4", "q5"), {
      piiNotice: null,
    });
    expect(text).toContain("- 次の話題：Q6「言い足し」（最後の質問）");
  });

  it("再開の話題の後は次の話題なし", () => {
    const text = renderTurnState(
      stateAfter("q1", "q2", "q3", "q4", "q6", RESUME_TOPIC_ID),
      { piiNotice: null }
    );
    expect(text).toContain("- いまの話題：R「付け足し」");
    expect(text).toContain("- 次の話題：なし（この話題が最後）");
  });
});

describe("renderChatOutputInstructions", () => {
  it("question_id に入れてよい値をいまと次の ID で示す", () => {
    expect(renderChatOutputInstructions(stateAfter("q1", "q2"))).toContain(
      "- question_id：いまの話題を続けるなら Q2、次の話題に移るなら Q3。"
    );
    expect(
      renderChatOutputInstructions(stateAfter("q1", "q2", "q2", "q2", "q2"))
    ).toContain("- question_id：今回は Q3");
  });
});

describe("renderSummaryState", () => {
  it("場面・残り・戻れるか・最後かを書く", () => {
    expect(
      renderSummaryState({
        phase: "first",
        remainingTurns: 4,
        canResume: true,
        isLast: false,
      })
    ).toBe(
      [
        "## 要約の状況（システムから）",
        "- 場面：初回の要約",
        "- 残りの発話：4回",
        "- インタビューに戻れるか：はい",
        "- これが最後の発話か：いいえ",
      ].join("\n")
    );
  });
});
