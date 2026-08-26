import "server-only";

import type { InterviewSession } from "../../shared/types";
import { findInterviewSessionWithConfigById } from "../repositories/interview-session-repository";
import {
  getAuthenticatedUser,
  isSessionOwner,
  type LoaderDeps,
} from "../utils/verify-session-ownership";

export type InterviewSessionWithBillId = InterviewSession & {
  bill_id: string;
};

/**
 * セッションIDからインタビューセッション詳細を取得（完了済みセッション含む）
 * 認可チェック: セッションの所有者のみがセッション情報を取得できる
 */
export async function getInterviewSessionById(
  sessionId: string,
  deps?: LoaderDeps
): Promise<InterviewSessionWithBillId | null> {
  const authResult = await getAuthenticatedUser(deps);

  if (!authResult.authenticated) {
    console.error("Failed to get user:", authResult.error);
    return null;
  }

  const { userId } = authResult;

  let session: Awaited<ReturnType<typeof findInterviewSessionWithConfigById>>;
  try {
    session = await findInterviewSessionWithConfigById(sessionId);
  } catch (error) {
    console.error("Failed to fetch interview session:", error);
    return null;
  }

  // 認可チェック: セッションの所有者と現在のユーザーが一致するか
  if (!isSessionOwner(session.user_id, userId)) {
    console.error("Unauthorized access to interview session");
    return null;
  }

  // 意見募集に紐づく施策IDを抽出（多対多のため最初の1件を使う）
  const { interview_configs: interviewConfig, ...sessionData } = session;
  const policyId =
    interviewConfig?.policies_interview_configs?.[0]?.policy_id ?? null;
  if (!policyId) {
    console.error("Policy not found for interview session");
    return null;
  }

  // セッションデータを返す（bill_idを追加）
  return {
    ...sessionData,
    bill_id: policyId,
  };
}
