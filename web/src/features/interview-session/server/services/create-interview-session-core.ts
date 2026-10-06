import "server-only";

import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { findInterviewParticipationRuleById } from "@/features/interview-config/server/repositories/interview-config-repository";
import type { InterviewSession } from "../../shared/types";
import { createInterviewSessionRecord } from "../repositories/interview-session-repository";
import type { LoaderDeps } from "../utils/verify-session-ownership";
import {
  type ParticipationDeps,
  requireInterviewParticipation,
} from "./resolve-interview-participation";

export type CreateInterviewSessionDeps = LoaderDeps & ParticipationDeps;

/**
 * インタビューセッション作成のコアロジック
 * 参加条件を満たさない場合は InterviewParticipationDeniedError を投げる。
 * テストからはDIで認証・外部IDの解決を差し替え可能
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

  const rule = await findInterviewParticipationRuleById(interviewConfigId);
  if (!rule) {
    throw new Error("Interview config not found");
  }

  const { externalIdentityId } = await requireInterviewParticipation({
    rule,
    userId: user.id,
    deps,
  });

  return createInterviewSessionRecord({
    interviewConfigId,
    userId: user.id,
    externalIdentityId,
  });
}
