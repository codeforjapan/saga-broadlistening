import {
  cleanupAll,
  cleanupTestUser,
  createTestPolicyContent,
  createTestPolicyWithConfig,
  createTestPublicOpinions,
  createTestUser,
  insertTestInterviewMessages,
  type TestUser,
} from "@test-utils/utils";

export type PublicReportLoaderContext = {
  user: TestUser;
  billId: string;
  configId: string;
  /** 施策と意見募集（配下のセッション・意見を含む）を削除する */
  cleanupPolicyWithConfig: () => Promise<void>;
};

type TestMessage = {
  role: "user" | "assistant";
  content: string;
};

type CreatePublicReportOptions = {
  isPublicByAdmin?: boolean;
  isPublicByUser?: boolean;
  reviewStatus?: "published" | "pending_review" | "hidden";
  summary?: string;
  roleTitle?: string;
  contentRichnessTotal?: number;
  messages?: TestMessage[];
};

export async function createPublicReportLoaderContext(
  billContentTitle = "施策タイトル"
): Promise<PublicReportLoaderContext> {
  const user = await createTestUser();
  const { policy, config, cleanup } = await createTestPolicyWithConfig({
    config: { name: `公開レポート loader テスト ${Date.now()}` },
  });

  try {
    await createTestPolicyContent(policy.id, { title: billContentTitle });
    return {
      user,
      billId: policy.id,
      configId: config.id,
      cleanupPolicyWithConfig: cleanup,
    };
  } catch (error) {
    // 元の失敗原因を隠さないよう、後片付けの失敗はログに留める。
    await cleanupAll(cleanup(), cleanupTestUser(user.id)).catch(
      (cleanupError) => console.error(String(cleanupError))
    );
    throw error;
  }
}

export async function cleanupPublicReportLoaderContext(
  context: PublicReportLoaderContext | null
) {
  if (!context) return;

  await cleanupAll(
    context.cleanupPolicyWithConfig(),
    cleanupTestUser(context.user.id)
  );
}

export async function createPublicReports(
  context: PublicReportLoaderContext,
  count: number,
  options: CreatePublicReportOptions = {}
) {
  const { sessions, opinions } = await createTestPublicOpinions({
    interviewConfigId: context.configId,
    userId: context.user.id,
    count,
    opinion: (index) => ({
      is_public_by_admin: options.isPublicByAdmin ?? true,
      is_public_by_user: options.isPublicByUser ?? true,
      review_status: options.reviewStatus ?? "published",
      role_title: options.roleTitle ?? "会社員",
      final_text: `公開意見の本文 ${index + 1}`,
      summary: options.summary
        ? `${options.summary}-${index + 1}`
        : `公開レポート ${index + 1}`,
      content_richness: {
        total: options.contentRichnessTotal ?? 70,
        clarity: 70,
        specificity: 70,
        impact: 70,
        constructiveness: 70,
        reasoning: "テスト用の十分な内容",
      },
    }),
  });

  if (options.messages) {
    for (const session of sessions) {
      await insertTestInterviewMessages(session.id, options.messages);
    }
  }

  return opinions.map((report, index) => ({
    report,
    session: sessions[index],
  }));
}

export async function createPublicReport(
  context: PublicReportLoaderContext,
  options: CreatePublicReportOptions = {}
) {
  const [fixture] = await createPublicReports(context, 1, options);
  if (!fixture) throw new Error("公開レポート作成に失敗しました");
  return fixture;
}
