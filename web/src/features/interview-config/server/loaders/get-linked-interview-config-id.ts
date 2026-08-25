import "server-only";

import { cache } from "react";
import { findPrimaryInterviewConfigByPolicyId } from "../repositories/interview-config-repository";

/**
 * 施策に紐づく意見募集（interview_configs）のIDを1件解決する。
 *
 * トピック分析・公開意見の集計はテーマ（interview_config）単位になったが、
 * URL とページの入口は施策IDのままのため、ここで変換する。
 * 1施策に複数の意見募集がある場合は募集中のものを優先し、なければ最新の1件を使う
 * （findPrimaryInterviewConfigByPolicyId が解決ルールの正本。
 *   複数テーマ表示の UI 対応は Epic #8 のフォローアップ）。
 */
export const getLinkedInterviewConfigId = cache(
  async (policyId: string): Promise<string | null> => {
    const { data, error } =
      await findPrimaryInterviewConfigByPolicyId(policyId);

    if (error) {
      console.error("Failed to resolve interview config for policy:", error);
      return null;
    }

    return data?.id ?? null;
  }
);
