import {
  adminClient,
  cleanupTestInterviewConfig,
  createTestInterviewConfig,
  type TestInterviewConfigOverrides,
} from "../utils";

/**
 * DBファンクションテスト共通のヘルパー。
 *
 * 施策を伴わず意見募集単位で完結する RPC のテストで使う。
 * 施策も要る場合は `utils.ts` の `createTestPolicyWithConfig()` を使う。
 */

/**
 * テスト内で作った意見募集を控えておき、まとめて削除できるようにする。
 *
 * 施策 ↔ 意見募集は多対多になり、施策を消しても意見募集は残る。
 * 消し漏らした意見募集の配下の意見は、対象を絞らない RPC
 * （`find_open_data_opinions` など）のテストを不安定にするため、
 * 意見募集を作るテストは必ずこのトラッカー経由で後片付けする。
 */
export function trackInterviewConfigs() {
  const configIds: string[] = [];

  /** 意見募集を1件作り、後片付け対象に登録する */
  async function createConfig(overrides: TestInterviewConfigOverrides = {}) {
    const config = await createTestInterviewConfig(overrides);
    configIds.push(config.id);
    return config;
  }

  /** `createConfig` と同じだが、id だけ使うテスト向け */
  async function createConfigId(
    overrides: TestInterviewConfigOverrides = {}
  ): Promise<string> {
    return (await createConfig(overrides)).id;
  }

  /** 登録済みの意見募集をすべて削除する（配下は CASCADE で消える） */
  async function cleanup(): Promise<void> {
    for (const configId of configIds.splice(0)) {
      await cleanupTestInterviewConfig(configId);
    }
  }

  return { createConfig, createConfigId, cleanup };
}

/** 1つの意見に対して、ユーザーごとのリアクションをまとめて作成する */
export async function createTestReactions(
  opinionId: string,
  userIds: string[],
  reactionType: "helpful" | "hmm" = "helpful"
): Promise<void> {
  const { error } = await adminClient.from("opinion_reactions").insert(
    userIds.map((userId) => ({
      opinion_id: opinionId,
      user_id: userId,
      reaction_type: reactionType,
    }))
  );
  if (error) throw new Error(`opinion_reactions 作成失敗: ${error.message}`);
}
