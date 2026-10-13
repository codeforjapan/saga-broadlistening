import type { SummaryState, TurnState, TurnTopic } from "./turn-control";

function topicNote(topic: TurnTopic, state: TurnState): string {
  if (state.remainingTopics.length === 1) return "（最後の質問）";
  if (topic.quickReplies.length > 0) return "（選択肢ボタンはシステムが出す）";
  return "";
}

function labelsOf(topics: TurnTopic[]): string {
  return topics.map((t) => t.label).join("・");
}

/** 次に聞ける話題の一覧。間の話題はどれから聞いてもよい */
function candidateLines(state: TurnState): string[] {
  const { candidates, remainingTopics } = state;
  if (candidates.length === 0) {
    return ["- 次に聞ける話題：なし（この話題が最後）"];
  }
  const lines = [
    candidates.length === 1
      ? "- 次に聞ける話題："
      : "- 次に聞ける話題（前の答えに自然につながるものを選ぶ）：",
    ...candidates.map(
      (t) => `  - ${t.label}「${t.question}」${topicNote(t, state)}`
    ),
  ];
  const later = remainingTopics.filter((t) => !candidates.includes(t));
  if (later.length > 0) {
    lines.push(
      `- 最後に聞く話題：${labelsOf(later)}（ほかの話題をすべて聞き終えてから）`
    );
  }
  return lines;
}

/** いまの話題の発話の数。目安を超えてよい話題は、目安と上限を分けて書く */
function topicTurnLine(state: TurnState): string {
  const { topicTurns, topicTurnTarget, topicTurnSoft, left } = state;
  const rest = `あと${left}回${left > 0 ? "（今回を含む）" : ""}`;
  if (!topicTurnSoft) {
    return `- この話題の発話：これまで${topicTurns}回。使える発話：${rest}`;
  }
  return `- この話題の発話：これまで${topicTurns}回（目安${topicTurnTarget}回。十分に聞けていなければ、目安を超えて続けてよい）。上限まで：${rest}`;
}

/**
 * 「いまの状況」節。コードが毎ターン作り、回答者には見せない。
 */
export function renderTurnState(state: TurnState): string {
  const { current, candidates, left } = state;
  const lines = [
    "# いまの状況（システムから。回答者には見せない）",
    `- 質問の発話：これまで${state.questionTurn}回（上限${state.questionTurnLimit}。最初の発話と要約は数えない。上限に達したら要約に入る）`,
  ];
  if (current) {
    lines.push(`- いまの話題：${current.label}「${current.question}」`, topicTurnLine(state));
  }
  if (left >= 1) {
    lines.push(
      "- 答えが十分でなければ続けて聞く。十分なら次の話題に移ってよい"
    );
  } else if (candidates.length > 0) {
    lines.push("- 今回は次の話題に移る");
  }
  lines.push(...candidateLines(state));
  if (state.remainingTopics.length > 0) {
    lines.push(
      `- まだ聞いていない話題：${state.remainingTopics.length}つ（回答者には伝えない）`
    );
  }
  if (current?.followUpGuide) {
    lines.push(
      `- この話題で聞けたら豊かになる観点：${current.followUpGuide}（満たさなくてよい）`
    );
  }
  return lines.join("\n");
}

/** 「出力」節。question_id に入れてよい値を、いまの話題と次に聞ける話題の ID で明記する */
export function renderChatOutputInstructions(state: TurnState): string {
  const { current, candidates, left } = state;
  // 候補が1つならその ID、複数なら選んだ話題の ID
  const nextIds =
    candidates.length === 1
      ? (candidates[0]?.label ?? "")
      : `選んだ話題の ID（${labelsOf(candidates)} のどれか）`;
  const qidLine =
    left === 0 && candidates.length > 0
      ? `- question_id：今回は ${nextIds}`
      : candidates.length > 0 && current
        ? `- question_id：いまの話題を続けるなら ${current.label}、次の話題に移るなら ${nextIds}。それ以外は入れない（続きを促すだけの発話はいまの話題）`
        : `- question_id：${current?.label ?? "なし"}`;
  return [
    qidLine,
    "- topic_title：その話題の短い名前",
    "- text：回答者に表示する本文",
    "- end_request：回答者が終えたい・やめたいとはっきり言ったら true（「疲れた」だけなら false）",
  ].join("\n");
}

/** 要約用プロンプトの「要約の状況」節 */
export function renderSummaryState(summaryState: SummaryState): string {
  const yesNo = (v: boolean) => (v ? "はい" : "いいえ");
  return [
    "## 要約の状況（システムから）",
    `- 場面：${summaryState.phase === "first" ? "初回の要約" : "返事を受けたところ"}`,
    `- 要約の段階で残りの発話：${summaryState.remainingTurns}回（今回を含む）`,
    `- インタビューに戻れるか：${yesNo(summaryState.canResume)}`,
    `- これが最後の発話か：${yesNo(summaryState.isLast)}`,
  ].join("\n");
}
