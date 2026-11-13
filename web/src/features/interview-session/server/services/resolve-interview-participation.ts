import "server-only";

import type { InterviewParticipationRule } from "@mirai-gikai/shared/interview-participation/participation-mode";
import {
  type GetExternalIdentitiesFn,
  resolveCurrentExternalIdentities,
} from "@/features/external-identity/server/services/resolve-current-external-identities";
import { InterviewParticipationDeniedError } from "../../shared/types/errors";
import {
  evaluateInterviewParticipation,
  type InterviewParticipation,
} from "../../shared/utils/evaluate-interview-participation";

export { InterviewParticipationDeniedError } from "../../shared/types/errors";

export type ParticipationDeps = {
  /** テスト時に Cookie に依存する外部IDの解決を差し替える */
  getExternalIdentities?: GetExternalIdentitiesFn;
};

/** 利用者に紐付いた外部IDを解決する（Cookie があれば確定・紐付けの書き込みを伴う） */
export function loadExternalIdentities(
  userId: string,
  deps?: ParticipationDeps
) {
  return (deps?.getExternalIdentities ?? resolveCurrentExternalIdentities)(
    userId
  );
}

/**
 * 利用者の外部IDを解決し、テーマの参加条件を満たさなければ
 * InterviewParticipationDeniedError を投げる。
 *
 * 各入口（チャットページ・チャット API・完了 API・Server Actions）はこれを共通で使う。
 * 外部IDの解決は1回で済ませ、結果の外部IDをセッションの記録にも使う。
 * 会話の所有者判定（user_id）とは別の判定なので、ここでは扱わない。
 */
export async function requireInterviewParticipation(params: {
  rule: InterviewParticipationRule;
  userId: string;
  /** 職員プレビュー（トークン検証済み）は参加条件を問わない */
  isPreview?: boolean;
  deps?: ParticipationDeps;
}): Promise<InterviewParticipation> {
  const identities = await loadExternalIdentities(params.userId, params.deps);
  const participation = evaluateInterviewParticipation({
    rule: params.rule,
    identities,
    isPreview: params.isPreview,
  });
  if (!participation.allowed) {
    throw new InterviewParticipationDeniedError();
  }
  return participation;
}
