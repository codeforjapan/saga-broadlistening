import type { InterviewStage } from "../schemas";

interface EndInterviewButtonVisibilityParams {
  stage: InterviewStage;
  /** 目安時間が設定され、残り時間を測っているか */
  hasTimer: boolean;
  /** 目安時間を超過したか */
  isTimeUp: boolean;
  /** 時間超過プロンプトを閉じたか（「続ける」・「終了」・回答送信のいずれでも） */
  timeUpDismissed: boolean;
}

/**
 * 常設の「終える」ボタンを出すかを判定する純粋関数。
 *
 * - 要約中は締めるために常に出す
 * - 対話中は目安時間まで付き合ってもらう方針のため、目安時間を超過し、
 *   時間超過プロンプトを閉じた後にだけ出す。超過直後はプロンプト側の
 *   終了ボタンが終える手段になるので、同時には出さない。プロンプトは応答待ちの
 *   間は隠れるため超過直後の応答待ちではどちらも出ないが、応答待ちの間は
 *   もともと終える操作を受け付けないので問題ない
 * - 目安時間がなく超過を判定できないときは、終える手段がなくならないよう常に出す
 */
export function isEndInterviewButtonVisible({
  stage,
  hasTimer,
  isTimeUp,
  timeUpDismissed,
}: EndInterviewButtonVisibilityParams): boolean {
  if (stage === "summary") return true;
  if (stage !== "chat") return false;
  if (!hasTimer) return true;
  return isTimeUp && timeUpDismissed;
}
