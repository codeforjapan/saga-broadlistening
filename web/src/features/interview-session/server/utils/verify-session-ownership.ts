import "server-only";

import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { findSessionOwnerById } from "../repositories/interview-session-repository";
import { resolveOwnership } from "../../shared/utils/resolve-ownership";
import {
  type ParticipationDeps,
  resolveInterviewParticipation,
} from "../services/resolve-interview-participation";

// 型をre-export
export type {
  AuthenticatedUserResult,
  VerifySessionOwnershipResult,
} from "../../shared/utils/resolve-ownership";
import type { VerifySessionOwnershipResult } from "../../shared/utils/resolve-ownership";

/** テスト時にDIで差し替え可能な認証関数の型 */
export type GetUserFn = () => Promise<{
  data: { user: { id: string } | null };
  error: Error | null;
}>;

export type LoaderDeps = {
  getUser?: GetUserFn;
};

/**
 * 認証済みユーザーを取得する共通ユーティリティ
 */
export async function getAuthenticatedUser(deps?: LoaderDeps) {
  const getUser = deps?.getUser ?? getChatSupabaseUser;
  const {
    data: { user },
    error: getUserError,
  } = await getUser();

  if (getUserError || !user) {
    return { authenticated: false as const, error: "認証が必要です" };
  }

  return { authenticated: true as const, userId: user.id };
}

/**
 * セッションの所有者確認を行う共通ユーティリティ
 * - ユーザー認証を確認
 * - セッションの所有者と現在のユーザーが一致するか確認
 */
export async function verifySessionOwnership(
  sessionId: string,
  deps?: LoaderDeps
) {
  const { ownership } = await verifySessionOwnershipWithRule(sessionId, deps);
  return ownership;
}

async function verifySessionOwnershipWithRule(
  sessionId: string,
  deps?: LoaderDeps
) {
  const authResult = await getAuthenticatedUser(deps);

  let session: Awaited<ReturnType<typeof findSessionOwnerById>> | null = null;
  try {
    session = await findSessionOwnerById(sessionId);
  } catch {
    // session remains null
  }

  return {
    ownership: resolveOwnership(authResult, session),
    rule: session?.interview_configs ?? null,
  };
}

/**
 * 会話を進める操作（チャットの完了・アーカイブ）向けに、所有者確認に加えて
 * テーマの参加条件も確認する。参加条件と所有権は別々に判定し、どちらか一方だけで
 * 許可しない（外部IDが一致しても他人の会話は操作できず、所有者でも参加条件を
 * 満たさなくなったテーマは進められない）。
 */
export async function verifySessionAccess(
  sessionId: string,
  deps?: LoaderDeps & ParticipationDeps
): Promise<VerifySessionOwnershipResult> {
  const { ownership, rule } = await verifySessionOwnershipWithRule(
    sessionId,
    deps
  );
  if (!ownership.authorized || !rule) {
    return ownership;
  }

  const participation = await resolveInterviewParticipation({
    rule,
    userId: ownership.userId,
    deps,
  });
  if (!participation.allowed) {
    return {
      authorized: false,
      error: "このテーマに回答するための条件を満たしていません",
    };
  }

  return ownership;
}

// Re-export from shared
export { isSessionOwner } from "../../shared/utils/ownership-check";
