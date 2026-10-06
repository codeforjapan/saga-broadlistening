import "server-only";

import { updateInterviewSessionArchived } from "../repositories/interview-session-repository";
import {
  type LoaderDeps,
  verifySessionAccess,
} from "../utils/verify-session-ownership";
import type { ParticipationDeps } from "./resolve-interview-participation";

export interface ArchiveInterviewSessionResult {
  success: boolean;
  error?: string;
}

/**
 * インタビューセッションをアーカイブするコアロジック
 * テストからはDIで認証を差し替え可能
 */
export async function archiveInterviewSessionCore(
  sessionId: string,
  deps?: LoaderDeps & ParticipationDeps
): Promise<ArchiveInterviewSessionResult> {
  const ownershipResult = await verifySessionAccess(sessionId, deps);

  if (!ownershipResult.authorized) {
    return { success: false, error: ownershipResult.error };
  }

  try {
    await updateInterviewSessionArchived(sessionId);
  } catch (error) {
    console.error("Failed to archive interview session:", error);
    return { success: false, error: "アーカイブに失敗しました" };
  }

  return { success: true };
}
