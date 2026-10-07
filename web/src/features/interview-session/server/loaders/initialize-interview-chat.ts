import "server-only";

import type { LanguageModel } from "ai";
import type { BillWithContent } from "@/features/bills/shared/types";
import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { resolveCurrentExternalIdentities } from "@/features/external-identity/server/services/resolve-current-external-identities";
import type { InterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { generateInitialQuestion } from "@/features/interview-session/server/services/generate-initial-question";
import type { InterviewMessage, InterviewSession } from "../../shared/types";
import {
  findActiveInterviewSession,
  findInterviewMessagesBySessionId,
  updateInterviewSessionExternalIdentity,
} from "../repositories/interview-session-repository";
import {
  type CreateInterviewSessionDeps,
  createInterviewSessionForUser,
} from "../services/create-interview-session-core";

type InitializeInterviewChatDeps = CreateInterviewSessionDeps & {
  model?: LanguageModel;
};

type InitializeInterviewChatResult = {
  session: InterviewSession;
  messages: InterviewMessage[];
};

/**
 * インタビューチャットの初期化処理
 * セッション取得/作成、メッセージ履歴取得、最初の質問生成を行う
 */
export async function initializeInterviewChat(
  interviewConfig: NonNullable<InterviewConfig>,
  bill: BillWithContent | null,
  deps?: InitializeInterviewChatDeps
): Promise<InitializeInterviewChatResult> {
  // 認証
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

  // セッション取得または作成
  let session = await findActiveInterviewSession(interviewConfig.id, user.id);
  if (!session) {
    session = await createInterviewSessionForUser({
      interviewConfigId: interviewConfig.id,
      userId: user.id,
      deps,
    });
  } else if (session.external_identity_id === null) {
    // チャットページを開いた後に UID を受け取った（#uid= の送信が初回描画より遅れた）場合、
    // 進行中のセッションにも外部IDを後から記録する
    session = await attachExternalIdentity(session, user.id, deps);
  }

  // メッセージ履歴を取得
  let messages = await findInterviewMessagesBySessionId(session.id);

  // メッセージ履歴が空の場合、最初の質問を生成
  if (messages.length === 0) {
    const initialQuestion = await generateInitialQuestion({
      sessionId: session.id,
      interviewConfig,
      bill,
      userId: user.id,
      deps: { model: deps?.model },
    });

    if (initialQuestion) {
      messages = [initialQuestion];
    }
  }

  return {
    session,
    messages,
  };
}

/** 進行中セッションに、いま紐付いている外部IDがあれば記録して返す */
async function attachExternalIdentity(
  session: InterviewSession,
  userId: string,
  deps?: InitializeInterviewChatDeps
): Promise<InterviewSession> {
  const getExternalIdentities =
    deps?.getExternalIdentities ?? resolveCurrentExternalIdentities;
  const [externalIdentity] = await getExternalIdentities(userId);
  if (!externalIdentity) return session;

  await updateInterviewSessionExternalIdentity(session.id, externalIdentity.id);
  return { ...session, external_identity_id: externalIdentity.id };
}
