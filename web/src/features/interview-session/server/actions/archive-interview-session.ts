"use server";

import {
  type ArchiveInterviewSessionResult,
  archiveInterviewSessionCore,
} from "../services/archive-interview-session-core";
import type { PreviewCredential } from "../services/verify-session-access";

/**
 * インタビューセッションをアーカイブする
 * アーカイブされたセッションは「やり直し」として扱われ、新しいセッションを開始できる。
 * プレビュー（職員確認）からの操作は、トークンが有効なら参加条件を問わない
 */
export async function archiveInterviewSession(
  sessionId: string,
  preview?: PreviewCredential
): Promise<ArchiveInterviewSessionResult> {
  return archiveInterviewSessionCore(sessionId, { preview });
}
