import "server-only";

import { findInterviewConfigWithPoliciesById } from "@/features/interview-config/server/repositories/interview-config-repository";
import {
  isInterviewVisible,
  isOpenInterview,
  toLinkedPolicies,
} from "@/features/interview-config/shared/utils/interview-visibility";
import { InterviewParticipationDeniedError } from "../../shared/types/errors";
import {
  createInterviewSessionRecord,
  findActiveInterviewSession,
} from "../repositories/interview-session-repository";
import { getAuthenticatedUser } from "../utils/verify-session-ownership";
import { requireInterviewParticipation } from "./resolve-interview-participation";
import {
  isValidPreviewForConfig,
  type PreviewCredential,
  type SessionAccessDeps,
} from "./verify-session-access";

export type StartInterviewSessionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * チャット冒頭の案内で「はじめる」を押したときに、同意を記録してセッションを作る（#158）。
 *
 * - 募集中で公開されているテーマだけ（職員プレビューは、そのテーマにつながる施策のトークンが有効なら可）
 * - 参加条件（スーパーアプリ連携 #144）を満たさなければ作らない
 * - 進行中のセッションがあれば作り直さない（二重送信でも1件）
 * テストからはDIで認証・外部IDの解決を差し替え可能。
 */
export async function startInterviewSessionCore(
  interviewConfigId: string,
  options: { preview?: PreviewCredential; deps?: SessionAccessDeps } = {}
): Promise<StartInterviewSessionResult> {
  const auth = await getAuthenticatedUser(options.deps);
  if (!auth.authenticated) {
    return { success: false, error: auth.error };
  }

  const { data: config, error } =
    await findInterviewConfigWithPoliciesById(interviewConfigId);
  if (error || !config) {
    return { success: false, error: "インタビューが見つかりません" };
  }

  const isPreview = await isValidPreviewForConfig(
    config.policies_interview_configs.flatMap((link) =>
      link.policies ? [link.policies.id] : []
    ),
    options.preview
  );

  const isAvailable =
    isOpenInterview(config.status) &&
    isInterviewVisible(toLinkedPolicies(config.policies_interview_configs));
  if (!isPreview && !isAvailable) {
    return { success: false, error: "このインタビューは現在募集していません" };
  }

  try {
    const [{ externalIdentityId }, activeSession] = await Promise.all([
      requireInterviewParticipation({
        rule: config,
        userId: auth.userId,
        isPreview,
        deps: options.deps,
      }),
      findActiveInterviewSession(config.id, auth.userId),
    ]);

    if (!activeSession) {
      await createInterviewSessionRecord({
        interviewConfigId: config.id,
        userId: auth.userId,
        externalIdentityId,
        consentedAt: new Date().toISOString(),
      });
    }
  } catch (cause) {
    if (cause instanceof InterviewParticipationDeniedError) {
      return { success: false, error: cause.message };
    }
    console.error("Failed to start interview session:", cause);
    return { success: false, error: "インタビューを開始できませんでした" };
  }

  return { success: true };
}
