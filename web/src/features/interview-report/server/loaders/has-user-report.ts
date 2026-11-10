import "server-only";

import { getChatSupabaseUserId } from "@/features/chat/server/utils/supabase-server";
import { hasUserReportForInterviewConfig } from "../repositories/interview-report-repository";

/**
 * 閲覧中の利用者が、その意見募集に回答したことがあるか。
 * 利用者がいなければ false。
 */
export async function hasUserReport(
  interviewConfigId: string
): Promise<boolean> {
  const userId = await getChatSupabaseUserId();
  if (!userId) return false;
  return hasUserReportForInterviewConfig(interviewConfigId, userId);
}
