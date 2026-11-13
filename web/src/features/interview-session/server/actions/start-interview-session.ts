"use server";

import {
  type StartInterviewSessionResult,
  startInterviewSessionCore,
} from "../services/start-interview-session-core";
import type { PreviewCredential } from "../../shared/types/errors";

/**
 * チャット冒頭の案内に同意してインタビューをはじめる（同意の記録とセッションの作成、#158）。
 * プレビュー（職員確認）からの操作は、トークンが有効なら参加条件と募集状態を問わない
 */
export async function startInterviewSession(
  interviewConfigId: string,
  preview?: PreviewCredential
): Promise<StartInterviewSessionResult> {
  return startInterviewSessionCore(interviewConfigId, { preview });
}
