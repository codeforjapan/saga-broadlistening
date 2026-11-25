import "server-only";

import { INTERVIEW_PARTICIPATION_DENIED_MESSAGE } from "@mirai-gikai/shared/interview-participation/participation-mode";
import { validatePreviewToken } from "@/features/bills/server/loaders/validate-preview-token";
import type { VerifySessionOwnershipResult } from "../../shared/utils/resolve-ownership";
import { resolveOwnership } from "../../shared/utils/resolve-ownership";
import type { PreviewCredential } from "../../shared/types/errors";
import { evaluateInterviewParticipation } from "../../shared/utils/evaluate-interview-participation";
import { findSessionAccessInfoById } from "../repositories/interview-session-repository";
import {
  getAuthenticatedUser,
  type LoaderDeps,
} from "../utils/verify-session-ownership";
import {
  loadExternalIdentities,
  type ParticipationDeps,
} from "./resolve-interview-participation";

export type SessionAccessDeps = LoaderDeps & ParticipationDeps;

export type { PreviewCredential };

/**
 * 職員プレビューのトークンが、このテーマにつながる施策のものとして有効か。
 * テーマにつながらない施策のトークンでは参加条件・募集状態を免除しない。
 */
export async function isValidPreviewForConfig(
  linkedPolicyIds: string[],
  preview: PreviewCredential | undefined
): Promise<boolean> {
  return (
    preview !== undefined &&
    linkedPolicyIds.includes(preview.policyId) &&
    (await validatePreviewToken(preview.policyId, preview.token))
  );
}

/**
 * 会話を進める操作（チャットの完了・アーカイブ）向けに、所有者確認に加えて
 * テーマの参加条件も確認する。参加条件と所有権は別々に判定し、どちらか一方だけで
 * 許可しない（外部IDが一致しても他人の会話は操作できず、所有者でも参加条件を
 * 満たさなくなったテーマは進められない）。
 *
 * public テーマでは外部IDを引かずに済ませる。プレビューはトークンを検証し、
 * その施策がこのセッションのテーマに紐づいているときだけ参加条件を免除する。
 */
export async function verifySessionAccess(
  sessionId: string,
  options?: { preview?: PreviewCredential },
  deps?: SessionAccessDeps
): Promise<VerifySessionOwnershipResult> {
  const [authResult, info] = await Promise.all([
    getAuthenticatedUser(deps),
    findSessionAccessInfoById(sessionId).catch(() => null),
  ]);

  const ownership = resolveOwnership(authResult, info);
  if (!ownership.authorized) {
    return ownership;
  }
  if (!info) {
    return { authorized: false, error: "セッションが見つかりません" };
  }

  const rule = info.interview_configs;
  if (rule.participation_mode === "public") {
    return ownership;
  }

  const isPreview = await isValidPreviewForConfig(
    rule.policies_interview_configs.map((link) => link.policy_id),
    options?.preview
  );

  const participation = evaluateInterviewParticipation({
    rule,
    identities: isPreview
      ? []
      : await loadExternalIdentities(ownership.userId, deps),
    isPreview,
  });
  if (!participation.allowed) {
    return {
      authorized: false,
      error: INTERVIEW_PARTICIPATION_DENIED_MESSAGE,
    };
  }

  return ownership;
}
