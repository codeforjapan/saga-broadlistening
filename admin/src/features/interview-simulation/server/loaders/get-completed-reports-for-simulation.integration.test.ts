import {
  cleanupAll,
  cleanupTestInterviewConfig,
  createTestInterviewConfig,
  createTestOpinion,
  createTestPolicyWithConfig,
  createTestSession,
  linkPolicyToInterviewConfig,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import { canUseReportForSimulation } from "../../shared/utils/simulation-scope";
import { getCompletedReportsForSimulation } from "./get-completed-reports-for-simulation";

/**
 * 候補一覧の絞り込みは PostgREST の埋め込み・内部結合に任せているため、実DBで検証する。
 *
 * 特に、施策で絞らない（抽象テーマ型の）ときに紐付けテーブルを内部結合すると、
 * 紐付けが0件の意見募集が丸ごと除外されて候補が常に空になる。
 * これはユニットテストでは検出できない。
 */
describe("getCompletedReportsForSimulation 統合テスト", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await cleanupAll(...cleanups.map((cleanup) => cleanup()));
    cleanups.length = 0;
  });

  /** 完了済み + 意見ありのセッションを1件作る */
  async function createCompletedReport(interviewConfigId: string) {
    const session = await createTestSession(interviewConfigId, null, {
      completed_at: new Date().toISOString(),
    });
    const opinion = await createTestOpinion(session.id);
    return { sessionId: session.id, reportId: opinion.id };
  }

  it("施策で絞ると、その施策に紐づく意見募集の完了レポートを返す", async () => {
    const { policy, config, cleanup } = await createTestPolicyWithConfig();
    cleanups.push(cleanup);
    const target = await createCompletedReport(config.id);

    const result = await getCompletedReportsForSimulation({
      interviewConfigId: config.id,
      policyId: policy.id,
    });

    const found = result.reports.find((r) => r.reportId === target.reportId);
    expect(found).toBeDefined();
    expect(found?.configId).toBe(config.id);
  });

  it("施策で絞ると、同じ施策の別テーマの完了レポートも候補に含む", async () => {
    const { policy, cleanup } = await createTestPolicyWithConfig();
    cleanups.push(cleanup);

    const siblingConfig = await createTestInterviewConfig();
    cleanups.push(() => cleanupTestInterviewConfig(siblingConfig.id));
    await linkPolicyToInterviewConfig(policy.id, siblingConfig.id);
    const target = await createCompletedReport(siblingConfig.id);

    const result = await getCompletedReportsForSimulation({
      interviewConfigId: siblingConfig.id,
      policyId: policy.id,
    });

    expect(result.reports.some((r) => r.reportId === target.reportId)).toBe(
      true
    );
  });

  it("施策に紐づかない抽象テーマ型でも、そのテーマの完了レポートを返す", async () => {
    const config = await createTestInterviewConfig();
    cleanups.push(() => cleanupTestInterviewConfig(config.id));
    const target = await createCompletedReport(config.id);

    const result = await getCompletedReportsForSimulation({
      interviewConfigId: config.id,
      policyId: null,
    });

    expect(result.reports.some((r) => r.reportId === target.reportId)).toBe(
      true
    );
  });

  it("抽象テーマ型では、別テーマの完了レポートは候補に含まない", async () => {
    const config = await createTestInterviewConfig();
    cleanups.push(() => cleanupTestInterviewConfig(config.id));
    const otherConfig = await createTestInterviewConfig();
    cleanups.push(() => cleanupTestInterviewConfig(otherConfig.id));
    const other = await createCompletedReport(otherConfig.id);

    const result = await getCompletedReportsForSimulation({
      interviewConfigId: config.id,
      policyId: null,
    });

    expect(result.reports.some((r) => r.reportId === other.reportId)).toBe(
      false
    );
  });

  it("完了していないセッションは候補に含まない", async () => {
    const config = await createTestInterviewConfig();
    cleanups.push(() => cleanupTestInterviewConfig(config.id));
    const session = await createTestSession(config.id, null);
    const opinion = await createTestOpinion(session.id);

    const result = await getCompletedReportsForSimulation({
      interviewConfigId: config.id,
      policyId: null,
    });

    expect(result.reports.some((r) => r.reportId === opinion.id)).toBe(false);
  });

  it("一覧に出た候補は、実行時のガードをすべて通る", async () => {
    // 候補一覧のクエリとガードの規則がずれると、選べるのに実行できない組み合わせが生まれる
    const { policy, config, cleanup } = await createTestPolicyWithConfig();
    cleanups.push(cleanup);
    await createCompletedReport(config.id);

    const scope = { interviewConfigId: config.id, policyId: policy.id };
    const result = await getCompletedReportsForSimulation(scope);

    for (const report of result.reports) {
      expect(
        canUseReportForSimulation(scope, {
          configId: report.configId,
          // 候補は施策に紐づく意見募集のものなので、対象施策を必ず含む
          policyIds: [policy.id],
        })
      ).toBe(true);
    }
  });
});
