import "server-only";

import { findPolicyIdsByInterviewConfigId } from "@/features/interview-config/server/repositories/interview-config-repository";
import type { SimulationScope } from "../../shared/utils/simulation-scope";

/**
 * 意見募集IDからシミュレーションの対象範囲を決める。
 *
 * ペルソナ素材の候補一覧（getCompletedReportsForSimulation）と、実行時のガード
 * （canUseReportForSimulation）が同じ範囲を見るよう、解決はここに一本化する。
 * クライアントから施策IDを受け取らないので、無関係な施策の資料や
 * レポートを指定される余地がない。
 */
export async function resolveSimulationScope(
  interviewConfigId: string
): Promise<SimulationScope> {
  const policyIds = await findPolicyIdsByInterviewConfigId(interviewConfigId);

  // 施策と意見募集は多対多。複数施策を並べる設計にはなっていないため先頭1件を使う
  return { interviewConfigId, policyId: policyIds[0] ?? null };
}
