import "server-only";

import { logger } from "@/lib/logger";
import type { InterviewMessage } from "../../shared/types";
import { createInterviewMessage } from "../repositories/interview-session-repository";

interface SaveInterviewMessageParams {
  sessionId: string;
  role: "assistant" | "user";
  content: string;
  isRetry?: boolean;
}

/**
 * インタビューメッセージをDBに保存し、保存した行を返す。保存しなかったときは null
 */
export async function saveInterviewMessage({
  sessionId,
  role,
  content,
  isRetry = false,
}: SaveInterviewMessageParams): Promise<InterviewMessage | null> {
  // リトライ時はユーザーメッセージの保存をスキップ（既に保存済み）
  if (isRetry && role === "user") {
    logger.debug("[Message Save] Skipping user message (retry)");
    return null;
  }

  return createInterviewMessage({ sessionId, role, content });
}
