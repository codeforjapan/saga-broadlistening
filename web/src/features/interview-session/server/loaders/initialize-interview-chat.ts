import "server-only";

import { isAuthSessionMissingError } from "@mirai-gikai/supabase";
import type { LanguageModel } from "ai";
import type { BillWithContent } from "@/features/bills/shared/types";
import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import type { InterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { generateInitialQuestion } from "@/features/interview-session/server/services/generate-initial-question";
import type { InterviewMessage, InterviewSession } from "../../shared/types";
import { resolveChatEntry } from "../../shared/utils/resolve-chat-entry";
import {
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

/**
 * まだ回答を始めていない（進行中のセッションがない）ときは開始画面を出す。
 * セッションは開始画面の「はじめる」（同意）で作るので、ここでは書き込まない（#158）。
 */
export type InitializeInterviewChatResult =
  | { kind: "start" }
  | {
      kind: "chat";
      session: InterviewSession;
      /**
       * メッセージ履歴。空のときは最初の質問を生成中の Promise（失敗したら空配列）。
       * ページの描画を AI の応答で止めないよう await せずに返し、Suspense の中で待つ（#229）
       */
      messages: InterviewMessage[] | Promise<InterviewMessage[]>;
    };

/**
 * インタビューチャットの初期化処理
 * 参加条件の判定、進行中セッションの取得、メッセージ履歴取得、最初の質問生成の開始を行う。
 * 進行中のセッションがない（初回訪問で利用者がまだいない場合も含む）ときは開始画面（kind: "start"）を返す。
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

  if (!user) {
    // 初回訪問では匿名ユーザーがまだいない（AuthGate がハイドレーション後に作る）。
    // 進行中のセッションもあり得ないので開始画面を返す。参加条件は「はじめる」と認証後の再描画で判定される（#228）
    if (!getUserError || isAuthSessionMissingError(getUserError)) {
      return { kind: "start" };
    }
    throw new Error(`Failed to get user: ${getUserError.message}`);
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

  // 進行中のセッションがなければ開始画面を出す（同意前にセッションを作らない）
  const entry = resolveChatEntry(activeSession);
  if (entry.kind === "start") {
    return entry;
  }

  // 紐付いている外部IDがあれば、参加条件に関係なく記録する
  let session = entry.session;
  if (session.external_identity_id === null && externalIdentityId) {
    // チャットページを開いた後に UID を受け取った（#uid= の送信が初回描画より遅れた）場合、
    // 進行中のセッションにも外部IDを後から記録する
    await updateInterviewSessionExternalIdentity(
      session.id,
      externalIdentityId
    );
    session = { ...session, external_identity_id: externalIdentityId };
  }

  // メッセージ履歴を取得。空なら最初の質問を生成する（初回の質問は施策を ID しか使わない）
  const history = await findInterviewMessagesBySessionId(session.id);
  const messages =
    history.length > 0
      ? history
      : generateInitialQuestion({
          sessionId: session.id,
          interviewConfig,
          bill,
          userId: user.id,
          deps: { model: deps?.model },
        }).then((question) => (question ? [question] : []));

  return { kind: "chat", session, messages };
}
