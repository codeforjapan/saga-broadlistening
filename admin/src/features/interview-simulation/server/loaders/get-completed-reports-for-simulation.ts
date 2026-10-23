import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { CompletedReportListItem } from "../../shared/types";
import type { SimulationScope } from "../../shared/utils/simulation-scope";

/**
 * シミュレーション画面の Select 候補として取得する上限。
 * 完了済みインタビューはUIドロップダウンで選ばせる想定なので、大量だと
 * スクロール困難で操作性を損なう。運用上 300 件を超えるケースは稀。
 * 上限に達した場合は `isTruncated=true` を返し、呼び出し側で警告表示する。
 */
const MAX_REPORTS_FOR_SIMULATION = 300;

export interface CompletedReportsResult {
  reports: CompletedReportListItem[];
  /** true なら MAX_REPORTS_FOR_SIMULATION で切り詰められている */
  isTruncated: boolean;
  /** UI 警告用の上限値 */
  limit: number;
}

/**
 * ペルソナ素材に使える「完了済みインタビュー + 意見あり」の一覧を取得する。
 *
 * 施策に紐づくテーマでは施策全体から引く。シミュレーション画面で、編集中の config に
 * 紐づくものと施策全体のものの両方から選べるようにするため、config_id 情報も返す
 * （クライアント側で configId フィルタを切り替えられる設計）。
 * 施策と意見募集は policies_interview_configs による多対多のため、中間テーブル経由で絞り込む。
 *
 * 施策を持たない抽象テーマ型は借りてこられる施策がないため、
 * そのテーマ自身の完了インタビューだけを対象にする。
 * 絞り込みの規則は canUseReportForSimulation（サーバー側のガード）と揃えること。
 */
export async function getCompletedReportsForSimulation(
  scope: SimulationScope
): Promise<CompletedReportsResult> {
  const supabase = createAdminClient();

  // 施策で絞る場合だけ紐付けを内部結合する。テーマで絞る場合に内部結合すると
  // 紐付けが0件の抽象テーマ型が丸ごと除外され、候補が常に空になる
  const scopedQuery = scope.policyId
    ? supabase
        .from("interview_sessions")
        .select(
          "id, completed_at, interview_config_id, interview_configs!inner(name, policies_interview_configs!inner(policy_id)), opinions!inner(id, role_title, summary, total_content_richness)"
        )
        .eq(
          "interview_configs.policies_interview_configs.policy_id",
          scope.policyId
        )
    : supabase
        .from("interview_sessions")
        .select(
          "id, completed_at, interview_config_id, interview_configs!inner(name), opinions!inner(id, role_title, summary, total_content_richness)"
        )
        .eq("interview_config_id", scope.interviewConfigId);

  const { data, error } = await scopedQuery
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(MAX_REPORTS_FOR_SIMULATION + 1);

  if (error) {
    throw new Error(`Failed to fetch completed reports: ${error.message}`);
  }

  const rows = data ?? [];
  // +1 件取って超過判定。超過時は配列を MAX 件に切り詰めて返す
  const isTruncated = rows.length > MAX_REPORTS_FOR_SIMULATION;
  const visibleRows = isTruncated
    ? rows.slice(0, MAX_REPORTS_FOR_SIMULATION)
    : rows;

  const reports: CompletedReportListItem[] = visibleRows.flatMap((session) => {
    const report = Array.isArray(session.opinions)
      ? session.opinions[0]
      : session.opinions;
    const config = Array.isArray(session.interview_configs)
      ? session.interview_configs[0]
      : session.interview_configs;
    if (!report) return [];
    return [
      {
        sessionId: session.id,
        reportId: report.id,
        configId: session.interview_config_id,
        configName: config?.name ?? null,
        roleTitle: report.role_title ?? null,
        summary: report.summary ?? null,
        totalContentRichness: report.total_content_richness ?? null,
        completedAt: session.completed_at ?? null,
      },
    ];
  });

  return { reports, isTruncated, limit: MAX_REPORTS_FOR_SIMULATION };
}
