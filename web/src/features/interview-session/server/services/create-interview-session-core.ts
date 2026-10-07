import "server-only";

import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import {
  type GetExternalIdentitiesFn,
  resolveCurrentExternalIdentities,
} from "@/features/external-identity/server/services/resolve-current-external-identities";
import type { InterviewSession } from "../../shared/types";
import { createInterviewSessionRecord } from "../repositories/interview-session-repository";
import type { LoaderDeps } from "../utils/verify-session-ownership";

export type CreateInterviewSessionDeps = LoaderDeps & {
  /** テスト時に Cookie に依存する外部IDの解決を差し替える */
  getExternalIdentities?: GetExternalIdentitiesFn;
};

/**
 * 認証済みユーザーのセッションを作成する。
 * 紐付いている外部IDがあれば、参加条件に関係なく先頭の1件を記録する。
 * セッション作成の経路（チャットページ初期化・Server Action）はすべてここを通す。
 */
export async function createInterviewSessionForUser({
  interviewConfigId,
  userId,
  deps,
}: {
  interviewConfigId: string;
  userId: string;
  deps?: Pick<CreateInterviewSessionDeps, "getExternalIdentities">;
}): Promise<InterviewSession> {
  const getExternalIdentities =
    deps?.getExternalIdentities ?? resolveCurrentExternalIdentities;
  const [externalIdentity] = await getExternalIdentities(userId);

  return createInterviewSessionRecord({
    interviewConfigId,
    userId,
    externalIdentityId: externalIdentity?.id ?? null,
  });
}

/**
 * インタビューセッション作成のコアロジック
 * テストからはDIで認証を差し替え可能
 */
export async function createInterviewSessionCore({
  interviewConfigId,
  deps,
}: {
  interviewConfigId: string;
  deps?: CreateInterviewSessionDeps;
}): Promise<InterviewSession> {
  const getUser = deps?.getUser ?? getChatSupabaseUser;
  const {
    data: { user },
    error: getUserError,
  } = await getUser();

  if (getUserError || !user) {
    throw new Error(
      `Failed to get user: ${getUserError?.message || "User not found"}`
    );
  }

  return createInterviewSessionForUser({
    interviewConfigId,
    userId: user.id,
    deps,
  });
}
