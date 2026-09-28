import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import {
  findBillById,
  findBillContentsByBillId,
} from "@/features/bills/server/repositories/bill-repository";
import {
  findInterviewConfigById,
  findInterviewQuestionsByConfigId,
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
  const policyId = policyIds[0];
  const [bill, contents] = policyId
    ? await Promise.all([
        findBillById(policyId),
        findBillContentsByBillId(policyId),
      ])
    : [null, []];
  return {
    interviewConfig,
    questions,
    bill: bill
      ? {
          ...bill,
          bill_content:
            contents.find((item) => item.difficulty_level === "normal") ?? null,
        }
      : null,
  };
}
