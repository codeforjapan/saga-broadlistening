import type { LinkedPolicy } from "@/features/interview-config/shared/utils/interview-visibility";
import {
  isInterviewVisible,
  isLinkedPolicy,
  selectPrimaryPolicyId,
} from "@/features/interview-config/shared/utils/interview-visibility";

/** 対話を実行してよいか、どの施策を材料にしてよいかの判定結果 */
export type InterviewChatAccess =
  | {
      /** プレビュートークンによる閲覧。下書き・終了した意見募集も対象にできる */
      mode: "preview";
      /** トークンの発行元施策。未公開でもプロンプトに載せてよい */
      policyId: string;
    }
  | {
      /** 一般公開の対話 */
      mode: "public";
      /** プロンプトに載せる公開済み施策。抽象テーマ型では null */
      policyId: string | null;
    }
  | { mode: "denied" };

type DecideParams = {
  /** 意見募集の状態（draft / open / closed） */
  status: string;
  /** 意見募集に紐づく施策 */
  policies: LinkedPolicy[];
  /** プレビュートークンの発行元として指定された施策 */
  previewPolicyId: string | undefined;
  /** そのトークンが有効か */
  isTokenValid: boolean;
};

/**
 * 意見募集に対して対話を始めてよいかを決める。
 *
 * - プレビューは、有効なトークンが「この意見募集に紐づく施策」に対して提示された場合のみ許可する。
 *   施策Aのトークンで無関係な施策Bの下書きテーマを覗けないようにするためのガード。
 * - 一般公開の対話は、募集中（open）かつ市民に見せてよい状態のときだけ許可する。
 * - 抽象テーマ型（施策0件）は施策なしのまま許可し、プロンプトにも施策を載せない。
 */
export function decideInterviewChatAccess({
  status,
  policies,
  previewPolicyId,
  isTokenValid,
}: DecideParams): InterviewChatAccess {
  if (
    isTokenValid &&
    previewPolicyId !== undefined &&
    isLinkedPolicy(policies, previewPolicyId)
  ) {
    return { mode: "preview", policyId: previewPolicyId };
  }

  if (status !== "open" || !isInterviewVisible(policies)) {
    return { mode: "denied" };
  }

  return { mode: "public", policyId: selectPrimaryPolicyId(policies) };
}
