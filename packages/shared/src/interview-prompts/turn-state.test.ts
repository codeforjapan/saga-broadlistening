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
  }))
);

function stateAfter(...ids: string[]) {
  return computeTurnState({
    topics,
    metas: ids.map((questionId) => ({
      questionId,
      stage: "chat" as const,
    })),
  });
}

describe("renderTurnState", () => {
  it("発話が残っていれば続けても移ってもよいと書く", () => {
    const text = renderTurnState(stateAfter("q1", "q2"));
    expect(text).toContain(
      "- 質問の発話：これまで1回（上限25。最初の発話と要約は数えない。上限に達したら要約に入る）"
    );
    expect(text).toContain(
      "- いまの話題：Q2「このテーマに関わることで、この1年に「よかった」と感じた場面を1つ教えてください。」。この話題で使える発話：あと4回（今回を含む）"
    );
    expect(text).toContain("- 続けても、次の話題に移ってもよい");
    expect(text).toContain(
      "- 次の話題：Q3「10年後、あなたが佐賀で過ごしている一日を、このテーマに関わる場面から描いてみてください。」（選択肢ボタンはシステムが出す）"
    );
    expect(text).toContain("- 残りの話題：Q3・Q4・Q5（あと3つ）");
    expect(text).toContain(
      "- この話題で聞けたら豊かになる観点：場面の具体、その場面の何が大事だったか（届かなくてよい）（満たさなくてよい）"
    );
  });

  it("話題の発話の上限を使い切ったら次の話題へ移るよう指示する", () => {
    const text = renderTurnState(
      stateAfter("q1", "q2", "q2", "q2", "q2", "q2", "q2")
    );
    expect(text).toContain("あと0回");
    expect(text).toContain("- 今回は次の話題に移る（question_id は Q3）");
  });

  it("最後の話題には「最後の質問」と書く", () => {
    const text = renderTurnState(stateAfter("q1", "q2", "q3", "q4"));
    expect(text).toContain(
      "- 次の話題：Q5「ほかに、10年後の佐賀について伝えておきたいことはありますか？」（最後の質問）"
    );
    expect(text).toContain("- 残りの話題：Q5（あと1つ）");
  });

  it("再開の話題の後は次の話題なし", () => {
    const text = renderTurnState(
      stateAfter("q1", "q2", "q3", "q4", "q5", RESUME_TOPIC_ID));
    expect(text).toContain(
      "- いまの話題：R「付け足したいことを続けて話してもらう」"
    );
    expect(text).toContain("- 次の話題：なし（この話題が最後）");
  });
});

describe("renderChatOutputInstructions", () => {
  it("question_id に入れてよい値をいまと次の ID で示す", () => {
    expect(renderChatOutputInstructions(stateAfter("q1", "q2"))).toContain(
      "- question_id：いまの話題を続けるなら Q2、次の話題に移るなら Q3。"
    );
    expect(
      renderChatOutputInstructions(
        stateAfter("q1", "q2", "q2", "q2", "q2", "q2", "q2")
      )
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
        "- 要約の段階で残りの発話：4回（今回を含む）",
        "- インタビューに戻れるか：はい",
        "- これが最後の発話か：いいえ",
      ].join("\n")
    );
  });
});
