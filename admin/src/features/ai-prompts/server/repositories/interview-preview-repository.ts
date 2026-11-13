import "server-only";
import { toPromptRelatedPolicies } from "@mirai-gikai/shared/interview-prompts/to-prompt-related-policies";
import { createAdminClient } from "@mirai-gikai/supabase";
import {
  findBillById,
  findBillContentsByBillId,
} from "@/features/bills/server/repositories/bill-repository";
import {
  findInterviewConfigById,
  findInterviewQuestionsByConfigId,
  findPolicyContentsByIds,
  findPolicyIdsByInterviewConfigId,
} from "@/features/interview-config/server/repositories/interview-config-repository";

export async function listInterviewPreviewOptions() {
  const { data, error } = await createAdminClient()
    .from("interview_configs")
    .select("id,name")
    .order("name");
  if (error) throw error;
  return data;
}

export async function findInterviewPreviewInput(configId: string) {
  const [interviewConfig, questions, policyIds] = await Promise.all([
    findInterviewConfigById(configId),
    findInterviewQuestionsByConfigId(configId),
    findPolicyIdsByInterviewConfigId(configId),
  ]);
  if (!interviewConfig) return null;
  const [policyId, ...relatedPolicyIds] = policyIds;
  // 本番と同じく、主たる施策以外に紐づく施策の標準（normal）本文も並べる
  const [bill, contents, relatedRows] = policyId
    ? await Promise.all([
        findBillById(policyId),
        findBillContentsByBillId(policyId),
        findPolicyContentsByIds(relatedPolicyIds, "normal"),
      ])
    : [null, [], []];
  return {
    interviewConfig,
    questions,
    bill: bill
      ? {
          ...bill,
          bill_content:
            contents.find((item) => item.difficulty_level === "normal") ?? null,
          related_policies: toPromptRelatedPolicies(
            relatedPolicyIds,
            relatedRows
          ),
        }
      : null,
  };
}
