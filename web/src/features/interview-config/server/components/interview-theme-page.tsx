import "server-only";

import { notFound } from "next/navigation";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getUserReportsByInterviewConfig } from "@/features/interview-report/server/loaders/get-user-reports-by-interview-config";
import { countPublicOpinionsByInterviewConfigId } from "@/features/interview-report/server/repositories/interview-report-repository";
import { getLatestInterviewSession } from "@/features/interview-session/server/loaders/get-latest-interview-session";
import { TopicsPreviewSection } from "@/features/user-topic-analysis/server/components/topics-preview-section";
import { getPublicTopicAnalysisByInterviewConfigId } from "@/features/user-topic-analysis/server/loaders/get-public-topic-analysis";
import { InterviewLPPage } from "../../client/components/interview-lp-page";
import { themeInterviewTarget } from "../../shared/types/interview-target";
import { selectPrimaryPolicyId } from "../../shared/utils/interview-visibility";
import { getInterviewConfigBySlug } from "../loaders/get-interview-config-by-slug";

interface InterviewThemePageProps {
  slug: string;
}

/**
 * テーマ単独の参加導線（/interviews/[slug]）。
 *
 * 施策に紐づくテーマも抽象テーマ型もこのページを通る。施策があればその情報も見せ、
 * 公開中のトピック分析があれば「寄せられた意見のまとめ」への導線を差し込む
 * （施策経由の導線では施策詳細ページ側に同じセクションを出している）。
 */
export async function InterviewThemePage({ slug }: InterviewThemePageProps) {
  const target = themeInterviewTarget(slug);
  const result = await getInterviewConfigBySlug(slug);

  if (!result) {
    notFound();
  }

  const { config, policies } = result;
  // 施策に紐づくテーマならその施策も見せる。抽象テーマ型では null になる
  const policyId = selectPrimaryPolicyId(policies);

  // テーマは上で解決済みなので、トピック分析ページの context（テーマを再解決する）は使わず
  // 分析と公開意見件数だけを引く。どちらもトピック分析ページと同じキャッシュに乗る。
  const [bill, latestSession, userReports, analysis, publicOpinionCount] =
    await Promise.all([
      policyId ? getBillById(policyId) : null,
      getLatestInterviewSession(config.id),
      getUserReportsByInterviewConfig(config.id),
      getPublicTopicAnalysisByInterviewConfigId(config.id),
      // 引用→会話ログのリンク表示は公開意見の件数で決まるため、
      // 分析に含まれる論点数（total_opinions）ではなく回答件数を引く。
      countPublicOpinionsByInterviewConfigId(config.id),
    ]);

  const topics = analysis?.topics ?? [];

  return (
    <InterviewLPPage
      target={target}
      bill={bill}
      interviewConfig={config}
      sessionInfo={latestSession}
      userReports={userReports}
      // 公開中の分析が無いテーマでは枠自体を出さない（空の余白を作らない）。
      topicsSection={
        topics.length > 0 ? (
          <TopicsPreviewSection
            target={target}
            topics={topics}
            publicOpinionCount={publicOpinionCount}
          />
        ) : undefined
      }
    />
  );
}
