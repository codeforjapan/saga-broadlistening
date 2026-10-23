import "server-only";

import { updateInterviewSessionArchived } from "../repositories/interview-session-repository";
import {
  type PreviewCredential,
  type SessionAccessDeps,
  verifySessionAccess,
} from "./verify-session-access";

export interface ArchiveInterviewSessionResult {
  success: boolean;
  error?: string;
}

/**
 * インタビューセッションをアーカイブするコアロジック
 * テストからはDIで認証・外部IDの解決を差し替え可能
 */
export async function archiveInterviewSessionCore(
  sessionId: string,
  options: { preview?: PreviewCredential; deps?: SessionAccessDeps } = {}
): Promise<ArchiveInterviewSessionResult> {
  const ownershipResult = await verifySessionAccess(
    sessionId,
    { preview: options.preview },
    options.deps
  );

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
