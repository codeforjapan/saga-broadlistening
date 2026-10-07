import "server-only";

import type { LanguageModel } from "ai";
import type { BillWithContent } from "@/features/bills/shared/types";
import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import type { InterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { generateInitialQuestion } from "@/features/interview-session/server/services/generate-initial-question";
import type { InterviewMessage, InterviewSession } from "../../shared/types";
import {
  createInterviewSessionRecord,
  findActiveInterviewSession,
  findInterviewMessagesBySessionId,
  updateInterviewSessionExternalIdentity,
} from "../repositories/interview-session-repository";
import { requireInterviewParticipation } from "../services/resolve-interview-participation";
import type { SessionAccessDeps } from "../services/verify-session-access";

type InitializeInterviewChatDeps = SessionAccessDeps & {
  model?: LanguageModel;
};

type InitializeInterviewChatOptions = {
  /** 職員のプレビュー（トークン検証済み）。参加条件を問わない */
  isPreview?: boolean;
};

type InitializeInterviewChatResult = {
  session: InterviewSession;
  messages: InterviewMessage[];
};

/**
 * インタビューチャットの初期化処理
 * 参加条件の判定、セッション取得/作成、メッセージ履歴取得、最初の質問生成を行う。
 * 参加条件を満たさない場合は InterviewParticipationDeniedError を投げる
 * （呼び出し側のページは LP へ戻す）。
 */
export async function initializeInterviewChat(
  interviewConfig: NonNullable<InterviewConfig>,
  bill: BillWithContent | null,
  options: InitializeInterviewChatOptions & {
    deps?: InitializeInterviewChatDeps;
  } = {}
): Promise<InitializeInterviewChatResult> {
  const { deps, isPreview } = options;

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

  // 参加条件の判定（回答開始前。外部IDの解決はここで1回だけ）と
  // 進行中セッションの取得は互いに依存しないので並列に走らせる。
  // 拒否はセッションを書き込む前に throw される
  const [{ externalIdentityId }, activeSession] = await Promise.all([
    requireInterviewParticipation({
      rule: interviewConfig,
      userId: user.id,
      isPreview,
      deps,
    }),
    findActiveInterviewSession(interviewConfig.id, user.id),
  ]);

  // セッション取得または作成。紐付いている外部IDがあれば、参加条件に関係なく記録する
  let session = activeSession;
  if (!session) {
    session = await createInterviewSessionRecord({
      interviewConfigId: interviewConfig.id,
      userId: user.id,
      externalIdentityId,
    });
  } else if (session.external_identity_id === null && externalIdentityId) {
    // チャットページを開いた後に UID を受け取った（#uid= の送信が初回描画より遅れた）場合、
    // 進行中のセッションにも外部IDを後から記録する
    await updateInterviewSessionExternalIdentity(
      session.id,
      externalIdentityId
    );
    session = { ...session, external_identity_id: externalIdentityId };
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
