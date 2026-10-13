import { QUESTION_TURN_LIMIT } from "./constants";
import type { SummaryState, TurnState, TurnTopic } from "./turn-control";

function nextNote(next: TurnTopic, state: TurnState): string {
  if (state.remainingTopics.length === 1) return "（最後の質問）";
  if (next.quickReplies.length > 0) return "（選択肢ボタンはシステムが出す）";
  return "";
}

function remainingTopicsLine(state: TurnState): string {
  const { remainingTopics } = state;
  if (remainingTopics.length === 0) return "- 残りの話題：なし";
  const labels = remainingTopics.map((t) => t.label).join("・");
  return `- 残りの話題：${labels}（あと${remainingTopics.length}つ）`;
}

/**
 * 「いまの状況」節。コードが毎ターン作り、回答者には見せない。
 */
export function renderTurnState(
  state: TurnState,
  { piiNotice }: { piiNotice: "pending" | "done" | null }
): string {
  const { current, next, left } = state;
  const lines = [
    "# いまの状況（システムから。回答者には見せない）",
    `- 質問の発話：これまで${state.questionTurn}回（上限${QUESTION_TURN_LIMIT}。最初の発話と要約は数えない。上限に達したら要約に入る）`,
  ];
  if (current) {
    lines.push(
      `- いまの話題：${current.label}「${current.question}」。この話題で使える発話：あと${left}回${left > 0 ? "（今回を含む）" : ""}`
    );
  }
  if (left >= 1) {
    lines.push("- 続けても、次の話題に移ってもよい");
  } else if (next) {
    lines.push(`- 今回は次の話題に移る（question_id は ${next.label}）`);
  }
  lines.push(
    next
      ? `- 次の話題：${next.label}「${next.question}」${nextNote(next, state)}`
      : "- 次の話題：なし（この話題が最後）"
  );
  lines.push(remainingTopicsLine(state));
  if (current?.followUpGuide) {
    lines.push(
      `- この話題で聞けたら豊かになる観点：${current.followUpGuide}（満たさなくてよい）`
    );
  }
  if (piiNotice) {
    lines.push(`- 伏せ字の案内：${piiNotice === "pending" ? "まだ" : "済み"}`);
  }
  return lines.join("\n");
}

/** 「出力」節。question_id に入れてよい値を、いまと次の話題の ID で明記する */
export function renderChatOutputInstructions(state: TurnState): string {
  const { current, next, left } = state;
  const qidLine =
    left === 0 && next
      ? `- question_id：今回は ${next.label}`
      : next && current
        ? `- question_id：いまの話題を続けるなら ${current.label}、次の話題に移るなら ${next.label}。それ以外は入れない（続きを促すだけの発話はいまの話題）`
        : `- question_id：${current?.label ?? "なし"}`;
  return [
    qidLine,
    "- topic_title：その話題の短い名前",
    "- text：回答者に表示する本文",
    "- end_request：回答者が終えたい・やめたいとはっきり言ったら true（「疲れた」だけなら false）",
    "- personal_request：直前の回答が、特定の場所や本人の案件への対応を求めていたら true",
    "- off_topic：直前の回答が、市政に関係するがこのテーマの外の話だったら true",
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
