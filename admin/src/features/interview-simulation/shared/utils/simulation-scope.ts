/**
 * シミュレーションの対象範囲。
 *
 * 施策に紐づく意見募集は、同じ施策配下の他テーマのレポートもペルソナ素材に使える
 * （従来からの挙動）。施策を持たない抽象テーマ型は借りてこられる施策がないため、
 * そのテーマ自身のレポートだけを対象にする。
 */
export type SimulationScope = {
  /** 対象の意見募集ID */
  interviewConfigId: string;
  /** 紐づく施策ID。抽象テーマ型では null */
  policyId: string | null;
};

/** レポートがどこに属するかの、範囲判定に必要な最小情報 */
export type ReportOwnership = {
  configId: string;
  /** レポートの意見募集に紐づく施策ID一覧。抽象テーマ型では空 */
  policyIds: string[];
};

/**
 * 選ばれたレポートを、この範囲のペルソナ素材として使ってよいか判定する。
 *
 * UI が出す候補と一致しない組み合わせ（別施策・別テーマのレポート混入）を弾くための
 * サーバー側ガード。判定は候補一覧のクエリ（getCompletedReportsForSimulation）と
 * 同じ規則にすること。施策で絞るときは「その施策に紐づく意見募集ならどれでも可」
 * なので、先頭1件ではなく紐づく施策すべてを見る。
 */
export function canUseReportForSimulation(
  scope: SimulationScope,
  report: ReportOwnership
): boolean {
  if (scope.policyId) {
    return report.policyIds.includes(scope.policyId);
  }
  return report.configId === scope.interviewConfigId;
}
