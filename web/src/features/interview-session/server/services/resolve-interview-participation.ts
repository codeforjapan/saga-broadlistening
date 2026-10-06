import "server-only";

import {
  canParticipateInInterview,
  type InterviewParticipationRule,
} from "@mirai-gikai/shared/interview-participation/participation-mode";
import {
  type GetExternalIdentitiesFn,
  resolveCurrentExternalIdentities,
} from "@/features/external-identity/server/services/resolve-current-external-identities";

/** 参加条件を満たさないときに各入口（ページ・API・Server Action）へ伝えるエラー */
export class InterviewParticipationDeniedError extends Error {
  constructor() {
    super("このテーマに回答するための条件を満たしていません");
    this.name = "InterviewParticipationDeniedError";
  }
}

export type ParticipationDeps = {
  /** テスト時に Cookie に依存する外部IDの解決を差し替える */
  getExternalIdentities?: GetExternalIdentitiesFn;
};

export type InterviewParticipation = {
  /** テーマの参加条件を満たしているか */
  allowed: boolean;
  /** 回答（セッション）に記録する外部ID。紐付きがなければ null */
  externalIdentityId: string | null;
};

/**
 * 利用者の外部IDを解決し、テーマの参加条件を満たすかを判定する。
 *
 * 各入口（チャットページ・チャットAPI・完了API・Server Actions）はこれを共通で使う。
 * 外部IDの解決は1回で済ませ、結果の外部IDをセッションの記録にも使う。
 * 会話の所有者判定（user_id）とは別の判定なので、ここでは扱わない。
 */
export async function resolveInterviewParticipation(params: {
  rule: InterviewParticipationRule;
  userId: string;
  deps?: ParticipationDeps;
}): Promise<InterviewParticipation> {
  const getExternalIdentities =
    params.deps?.getExternalIdentities ?? resolveCurrentExternalIdentities;
  const identities = await getExternalIdentities(params.userId);

  return {
    allowed: canParticipateInInterview({
      rule: params.rule,
      linkedProviderKeys: identities.map((identity) => identity.providerKey),
    }),
    externalIdentityId: identities[0]?.id ?? null,
  };
}

/** 参加条件を満たさなければ InterviewParticipationDeniedError を投げる */
export async function requireInterviewParticipation(params: {
  rule: InterviewParticipationRule;
  userId: string;
  deps?: ParticipationDeps;
}): Promise<InterviewParticipation> {
  const participation = await resolveInterviewParticipation(params);
  if (!participation.allowed) {
    throw new InterviewParticipationDeniedError();
  }
  return participation;
}
