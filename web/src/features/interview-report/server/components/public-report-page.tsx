import "server-only";

import { Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getKikaseteBoxByConfigId } from "@/features/interview-config/server/loaders/get-kikasete-box";
import { ShareArticleButton } from "@/features/interview-report/client/components/share-article-button";
import { VoicesPageFrame } from "@/features/user-topic-analysis/server/components/voices-page-frame";
import { routes } from "@/lib/routes";
import { getOrigin } from "@/lib/utils/url";
import { BackToBillButton } from "../../shared/components/back-to-bill-button";
import { ChatLogSection } from "../../shared/components/chat-log-section";
import { ReportIntervieweeCard } from "../../shared/components/report-interviewee-card";
import { ReportMainOpinions } from "../../shared/components/report-main-opinions";
import { ReportProblemButton } from "../../shared/components/report-problem-button";
import { resolveReportSubject } from "../../shared/utils/public-report-display";
import { getPublicReportById } from "../loaders/get-public-report-by-id";

interface PublicReportPageProps {
  reportId: string;
  from?: "opinions";
  /** 引用元の逐語テキスト。会話ログ内の該当箇所を太字表示する。 */
  highlightQuote?: string;
  /** ハイライト対象のメッセージID。指定したメッセージ内のみ太字化し、無関係なメッセージは対象外にする。 */
  highlightMessageId?: string;
}

export async function PublicReportPage({
  reportId,
  from,
  highlightQuote,
  highlightMessageId,
}: PublicReportPageProps) {
  const data = await getPublicReportById(reportId);

  if (!data) {
    notFound();
  }

  // 見出し・戻り導線は、施策があれば施策、なければ起点になったテーマを指す
  const subject = resolveReportSubject(data.bill, data.origin);
  const [siteOrigin, kikasete] = await Promise.all([
    getOrigin(),
    // ページ下部のきかせてボックス。募集中のときだけ、この意見が寄せられたテーマへ誘導する
    data.origin.theme.isOpen
      ? getKikaseteBoxByConfigId(data.interviewConfigId)
      : null,
  ]);
  const shareUrl = `${siteOrigin}${routes.publicReport(reportId)}`;
  const ogImageUrl = `${siteOrigin}/api/og/report?id=${reportId}`;

  const breadcrumbItems: BreadcrumbItem[] = [
    // 起点は施策名（親施策なら「若者支援」）。トピック一覧のパンくずとそろえる（#159）
    { label: subject.name, href: subject.href },
    { label: "レポート詳細" },
  ];

  return (
    <VoicesPageFrame kikasete={kikasete}>
      {/* パンくず + 施策タイトル */}
      <div className="flex flex-col gap-2">
        <Breadcrumb items={breadcrumbItems} />
        <Link
          href={subject.href as Route}
          className="inline-flex items-center gap-2 text-[15px] font-medium leading-6 text-foreground"
        >
          <span className="underline">{subject.name}</span>
          <Undo2 className="size-4 shrink-0" />
        </Link>
      </div>

      <h1 className="text-[22px] font-bold leading-9 text-foreground">
        💬インタビューレポート
      </h1>

      {/* 回答者カード */}
      <ReportIntervieweeCard
        roleTitle={data.role_title}
        roleDescription={data.role_description}
        sessionStartedAt={data.session_started_at}
        sessionCompletedAt={data.session_completed_at}
        characterCount={data.characterCount}
      />

      {/* 主な意見 */}
      <ReportMainOpinions opinions={data.opinions} reportId={reportId} />

      {/* すべての会話ログ */}
      {data.messages.length > 0 && (
        <ChatLogSection
          messages={data.messages}
          highlightQuote={highlightQuote}
          highlightMessageId={highlightMessageId}
        />
      )}

      {/* アクション */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <ShareArticleButton
          billName={subject.name}
          shareUrl={shareUrl}
          ogImageUrl={ogImageUrl}
          shareMessage={data.summary}
        />
        <BackToBillButton
          origin={data.origin}
          from={from}
          policyName={data.bill?.name}
        />
        <ReportProblemButton />
      </div>
    </VoicesPageFrame>
  );
}
