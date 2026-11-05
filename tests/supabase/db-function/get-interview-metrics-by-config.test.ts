import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  cleanupTestInterviewConfig,
  cleanupTestUser,
  createTestInterviewConfig,
  createTestSession,
  createTestUser,
} from "../utils";

/**
 * get_interview_metrics_by_config の統合テスト。
 *
 * 検証観点:
 * - completed_at の有無による実施数・完了数のカウント
 * - 完了率（completed/conducted）の算出と丸め
 * - セッション0件の意見募集（実施0・完了率0）の扱い
 * - draft / closed の意見募集も集計対象に含まれること（状態で除外しない）
 * - 総回答時間（total_duration_seconds）の合算と発言の無い未完了セッションの除外
 * - p_interview_config_id によるフィルタ
 */
describe("get_interview_metrics_by_config", () => {
  // configOpen: 3件中2件完了 => 実施3・完了2・率0.667
  let configOpenId: string;
  // configEmpty: セッション0件 => 実施0・完了0・率0
  let configEmptyId: string;
  // configClosed: 終了済み（セッション2件完了） => 状態に関わらず集計される
  let configClosedId: string;
  // configDraft: 下書き（セッション1件） => 状態に関わらず集計される
  let configDraftId: string;
  // configDuration: 60秒+120秒の完了2件 + 発言の無い未完了1件 => 総回答時間180秒
  let configDurationId: string;
  let user: { id: string };

  async function insertSession(
    configId: string,
    completed: boolean,
    durationSeconds = 0
  ) {
    const startedAt = new Date();
    const completedAt = completed
      ? new Date(startedAt.getTime() + durationSeconds * 1000).toISOString()
      : null;
    await createTestSession(configId, user.id, {
      started_at: startedAt.toISOString(),
      completed_at: completedAt,
    });
  }

  beforeAll(async () => {
    user = await createTestUser();

    configOpenId = (await createTestInterviewConfig({ status: "open" })).id;
    await insertSession(configOpenId, true);
    await insertSession(configOpenId, true);
    await insertSession(configOpenId, false);

    configEmptyId = (await createTestInterviewConfig({ status: "open" })).id;

    configClosedId = (await createTestInterviewConfig({ status: "closed" })).id;
    await insertSession(configClosedId, true);
    await insertSession(configClosedId, true);

    configDraftId = (await createTestInterviewConfig({ status: "draft" })).id;
    await insertSession(configDraftId, false);

    configDurationId = (await createTestInterviewConfig()).id;
    await insertSession(configDurationId, true, 60);
    await insertSession(configDurationId, true, 120);
    await insertSession(configDurationId, false);
  });

  afterAll(async () => {
    for (const configId of [
      configOpenId,
      configEmptyId,
      configClosedId,
      configDraftId,
      configDurationId,
    ]) {
      await cleanupTestInterviewConfig(configId);
    }
    await cleanupTestUser(user.id);
  });

  it("実施数・完了数・完了率を算出する", async () => {
    const { data, error } = await adminClient.rpc(
      "get_interview_metrics_by_config",
      { p_interview_config_id: configOpenId }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const row = data?.[0];
    expect(row?.interview_config_id).toBe(configOpenId);
    expect(Number(row?.conducted_count)).toBe(3);
    expect(Number(row?.completed_count)).toBe(2);
    expect(Number(row?.completion_rate)).toBeCloseTo(0.667, 3);
    // 完了セッションは started_at と completed_at が同時刻のため所要時間0
    expect(Number(row?.total_duration_seconds)).toBe(0);
  });

  it("セッション0件の意見募集は実施0・完了率0で返す", async () => {
    const { data, error } = await adminClient.rpc(
      "get_interview_metrics_by_config",
      { p_interview_config_id: configEmptyId }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const row = data?.[0];
    expect(Number(row?.conducted_count)).toBe(0);
    expect(Number(row?.completed_count)).toBe(0);
    expect(Number(row?.completion_rate)).toBe(0);
    expect(Number(row?.total_duration_seconds)).toBe(0);
  });

  it("総回答時間（total_duration_seconds）を所要時間の合計として返す", async () => {
    const { data, error } = await adminClient.rpc(
      "get_interview_metrics_by_config",
      { p_interview_config_id: configDurationId }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const row = data?.[0];
    expect(Number(row?.conducted_count)).toBe(3);
    expect(Number(row?.completed_count)).toBe(2);
    // 60秒 + 120秒。発言の無い未完了セッションは集計対象外
    expect(Number(row?.total_duration_seconds)).toBe(180);
  });

  it("closed / draft の意見募集も状態に関わらず集計する", async () => {
    const { data: closed } = await adminClient.rpc(
      "get_interview_metrics_by_config",
      { p_interview_config_id: configClosedId }
    );
    expect(closed).toHaveLength(1);
    expect(Number(closed?.[0].conducted_count)).toBe(2);
    expect(Number(closed?.[0].completed_count)).toBe(2);

    const { data: draft } = await adminClient.rpc(
      "get_interview_metrics_by_config",
      { p_interview_config_id: configDraftId }
    );
    expect(draft).toHaveLength(1);
    expect(Number(draft?.[0].conducted_count)).toBe(1);
    expect(Number(draft?.[0].completed_count)).toBe(0);
  });

  it("p_interview_config_id未指定なら全ての意見募集を返す", async () => {
    const { data, error } = await adminClient.rpc(
      "get_interview_metrics_by_config",
      {}
    );

    expect(error).toBeNull();
    const byId = new Map((data ?? []).map((r) => [r.interview_config_id, r]));
    expect(byId.has(configOpenId)).toBe(true);
    expect(byId.has(configEmptyId)).toBe(true);
    expect(byId.has(configClosedId)).toBe(true);
    expect(byId.has(configDraftId)).toBe(true);
    expect(Number(byId.get(configOpenId)?.conducted_count)).toBe(3);
  });

  it("存在しないIDを指定すると空の結果を返す", async () => {
    const { data, error } = await adminClient.rpc(
      "get_interview_metrics_by_config",
      { p_interview_config_id: "00000000-0000-0000-0000-000000000000" }
    );

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
