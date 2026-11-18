import "server-only";

import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getBillByIdAdmin } from "@/features/bills/server/loaders/get-bill-by-id-admin";
import { validatePreviewToken } from "@/features/bills/server/loaders/validate-preview-token";
import type { InterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { getInterviewConfigWithPoliciesById } from "@/features/interview-config/server/loaders/get-interview-config-by-id";
import { decideInterviewChatAccess } from "../../shared/utils/interview-chat-access";
import {
  type BillWithRelatedPolicies,
  withRelatedPolicies,
} from "./with-related-policies";

export type InterviewChatContext = {
  interviewConfig: NonNullable<InterviewConfig>;
  /**
   * プロンプトに載せる施策。抽象テーマ型・未公開施策では null。
   * 同じ意見募集に紐づく他の公開済み施策を related_policies に持つ
   */
  bill: BillWithRelatedPolicies | null;
  /** テレメトリと利用コスト記録に残す施策ID */
  policyId: string | null;
  /** 職員のプレビュー（トークン検証済み）。参加条件を問わない */
  isPreview: boolean;
};

type ResolveParams = {
  interviewConfigId: string;
  /** プレビュー画面のみが送る。トークンの発行元施策 */
  previewPolicyId?: string;
  previewToken?: string;
};

/**
 * 対話に必要な意見募集と施策を、意見募集IDから解決する。
 *
 * クライアントは意見募集IDだけを送り、施策はサーバーが紐付けから引く。
 * これにより「テーマAの設定で無関係な施策Bの本文をプロンプトに載せる」といった
 * 組み合わせがクライアント側から作れなくなる。
 *
 * 公開してよいかの判定そのものは decideInterviewChatAccess に切り出してある。
 */
export async function resolveInterviewChatContext({
  interviewConfigId,
  previewPolicyId,
  previewToken,
}: ResolveParams): Promise<InterviewChatContext | null> {
  // トークンの検証は意見募集の内容に依存しないので、取得と同時に走らせる
  const [result, isTokenValid] = await Promise.all([
    getInterviewConfigWithPoliciesById(interviewConfigId),
    previewToken !== undefined && previewPolicyId !== undefined
      ? validatePreviewToken(previewPolicyId, previewToken)
      : false,
  ]);

  if (!result) {
    return null;
  }

  const { config: interviewConfig, policies } = result;
  const access = decideInterviewChatAccess({
    status: interviewConfig.status,
    policies,
    previewPolicyId,
    isTokenValid,
  });

  if (access.mode === "denied") {
    return null;
  }

  // プレビューでは未公開施策も読める管理者用ローダーを使う
  const bill =
    access.mode === "preview"
      ? await getBillByIdAdmin(access.policyId)
      : access.policyId
        ? await getBillById(access.policyId)
        : null;

  return {
    interviewConfig,
    bill: await withRelatedPolicies(bill, interviewConfigId),
    policyId: access.policyId,
    isPreview: access.mode === "preview",
  };
}
