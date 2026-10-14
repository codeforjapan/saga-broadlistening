import "server-only";

import { notFound } from "next/navigation";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getUserReportsByInterviewConfig } from "@/features/interview-report/server/loaders/get-user-reports-by-interview-config";
import { countPublicOpinionsByInterviewConfigId } from "@/features/interview-report/server/repositories/interview-report-repository";
import { getLatestInterviewSession } from "@/features/interview-session/server/loaders/get-latest-interview-session";
import { getPublicTopicAnalysisByInterviewConfigId } from "@/features/user-topic-analysis/server/loaders/get-public-topic-analysis";
import { routes } from "@/lib/routes";
import { KikasetePage } from "../../client/components/kikasete-page";
import { themeInterviewTarget } from "../../shared/types/interview-target";
import { selectPrimaryPolicyId } from "../../shared/utils/interview-visibility";
import { formatVoicesMeta } from "../../shared/utils/voices-meta";
import { getInterviewConfigBySlug } from "../loaders/get-interview-config-by-slug";
import { getInterviewParticipationView } from "../loaders/get-interview-participation-view";

interface InterviewThemePageProps {
  slug: string;
}

/**
 * テーマのきかせてページ（/interviews/[slug]、#158）。
 *
 * インタビューの説明と、これまでの声（公開中のトピック分析）への入口を出す。
 * テーマにつながる施策（親施策）があれば、その本文のタイトルをサブ見出しに、施策ページを戻り先にする。
 */
export async function InterviewThemePage({ slug }: InterviewThemePageProps) {
  const target = themeInterviewTarget(slug);
  const result = await getInterviewConfigBySlug(slug);

  if (!result) {
    notFound();
  }

  const { config, policies } = result;
  // 施策に紐づくテーマならその施策を戻り先にする。抽象テーマ型では null になる
  const policyId = selectPrimaryPolicyId(policies);

  const [
    bill,
    latestSession,
    userReports,
    analysis,
    publicOpinionCount,
    participation,
  ] = await Promise.all([
    policyId ? getBillById(policyId) : null,
    getLatestInterviewSession(config.id),
    getUserReportsByInterviewConfig(config.id),
    getPublicTopicAnalysisByInterviewConfigId(config.id),
    // 「N件のご意見」は公開された回答の件数。分析の total_opinions は論点の数なので使わない
    countPublicOpinionsByInterviewConfigId(config.id),
    getInterviewParticipationView(config),
  ]);

  return (
    <KikasetePage
      target={target}
      interviewConfig={config}
      subtitle={bill?.bill_content?.title ?? null}
      sessionInfo={latestSession}
      participation={participation}
      userReports={userReports}
      // 公開中の分析が無いテーマでは「これまでの声」を出さない（まとめは #161 で足す）
      voices={
        analysis && analysis.topics.length > 0
          ? {
              meta: formatVoicesMeta({
                opinionCount: publicOpinionCount,
                updatedAt: analysis.generated_at,
              }),
              topicsHref: routes.interviewThemeTopics(slug),
            }
          : null
      }
      back={
        bill
          ? { href: routes.billDetail(bill.id), label: `${bill.name}に戻る` }
          : { href: routes.interviews(), label: "テーマ一覧に戻る" }
      }
    />
  );
}
