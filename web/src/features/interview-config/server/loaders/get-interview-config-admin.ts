import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { findPrimaryInterviewConfigByPolicyId } from "../repositories/interview-config-repository";
import type { InterviewConfig } from "./get-interview-config";

export type { InterviewConfig };

/**
 * 管理者用のインタビュー設定取得
 * 複数設定がある場合は、募集中の設定を優先し、なければ最新の設定を返す
 */
export async function getInterviewConfigAdmin(
  billId: string
): Promise<InterviewConfig | null> {
  return _getCachedInterviewConfigAdmin(billId);
}

const _getCachedInterviewConfigAdmin = unstable_cache(
  async (billId: string): Promise<InterviewConfig | null> => {
    // 募集中を優先し、なければ最新。解決ルールはリポジトリ側に一本化している
    const { data, error } = await findPrimaryInterviewConfigByPolicyId(billId);

    if (error) {
      console.error("Failed to fetch interview config (admin):", error);
      return null;
    }

    return data;
  },
  ["interview-config-admin"],
  {
    revalidate: 60, // 非公開設定をプレビューするので短めに
    tags: [CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);
