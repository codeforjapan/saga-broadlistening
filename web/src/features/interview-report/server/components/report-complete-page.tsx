import "server-only";

import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { PublicStatusSection } from "@/features/interview-report/client/components/public-status-section";
import { getInterviewReportById } from "@/features/interview-report/server/loaders/get-interview-report-by-id";
import { getInterviewMessages } from "@/features/interview-session/server/loaders/get-interview-messages";
import { getPublishedVoiceSummary } from "@/features/voice-summary/server/loaders/get-published-voice-summary";
import { BackToBillButton } from "../../shared/components/back-to-bill-button";
import { ReportBreadcrumb } from "../../shared/components/report-breadcrumb";
import { ReportContent } from "../../shared/components/report-content";
import { ReportProblemButton } from "../../shared/components/report-problem-button";
import { resolveReportSubject } from "../../shared/utils/public-report-display";
import { resolveReportNextAction } from "../../shared/utils/report-next-action";
import { countCharacters } from "../../shared/utils/report-utils";
import { getReportOpinions } from "../loaders/get-report-opinions";

interface ReportCompletePageProps {
  reportId: string;
}

export async function ReportCompletePage({
  reportId,
}: ReportCompletePageProps) {
  // レポートIDから全ての情報を取得
  // 完了ページなので、所有者のみが閲覧できるように制限する
  const report = await getInterviewReportById(reportId, { onlyOwner: true });

  if (!report) {
    notFound();
  }

  const { policyId } = report.origin;

  // 施策・メッセージ・論点単位の意見・テーマのまとめを並列取得。
  // 抽象テーマ型には施策がないので、その場合は取得しない
  const [bill, messages, opinions, voiceSummary] = await Promise.all([
    policyId ? getBillById(policyId) : null,
    getInterviewMessages(report.interview_session_id),
    getReportOpinions(reportId),
    getPublishedVoiceSummary(report.interview_config_id),
  ]);

  const characterCount = countCharacters(messages);
  // 見出し直下のリンクは、施策があれば施策詳細、なければテーマのページを指す
  const subject = resolveReportSubject(bill, report.origin);
  const nextAction = resolveReportNextAction({
    origin: report.origin,
    policyName: bill?.name,
    hasPublishedSummary: voiceSummary != null,
  });

  return (
    <div className="theme-interview min-h-dvh bg-background">
      {/* ヘッダーセクション */}
      <div className="bg-white rounded-b-[32px] px-4 pt-30 md:pt-16 pb-8">
        <div className="flex flex-col items-center gap-4">
          {/* 完了イラスト */}
          <Image
            src="/illustrations/interview-complete.svg"
            alt="完了"
            width={236}
            height={152}
          />

          {/* 完了メッセージ */}
          <h1 className="text-2xl font-bold text-center text-foreground leading-relaxed">
            提出が完了しました！
            <br />
            ご協力ありがとうございました
          </h1>

          {/* 活用メッセージ */}
          <p className="text-sm text-foreground">
            いただいた声は施策検討に最大限活用します
          </p>

          {/* 次の導線（まとめ → 施策 → サイトトップの順に、あるものへ） */}
          <Button asChild className="mt-2 w-full max-w-sm text-base">
            <Link href={nextAction.href as Route}>
              {nextAction.label}
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {/* インタビューレポートセクション */}
      <div className="px-4 py-10">
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-9">
          {/* 見出し行：テーマのタグ・見出しと公開の状態（#278） */}
          <div className="flex flex-col gap-3 border-b border-border pb-4">
            <Link
              href={subject.href as Route}
              className="w-fit rounded-full bg-secondary px-3 py-0.5 text-xs font-bold text-primary-accent hover:underline"
            >
              {subject.name}
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                インタビューレポート
              </h2>
              <PublicStatusSection
                sessionId={report.interview_session_id}
                initialIsPublic={report.is_public_by_user}
              />
            </div>
          </div>

          <ReportContent
            reportId={reportId}
            from="complete"
            summary={report.summary}
            sessionStartedAt={report.session_started_at}
            characterCount={characterCount}
            // 会話ログを公開しないテーマ（#278）では、本人にも会話ログを出さない
            messages={report.chatLogPublic ? messages : undefined}
            opinions={opinions}
          />

          <div className="flex flex-col items-center gap-3">
            <BackToBillButton
              origin={report.origin}
              from="complete"
              policyName={bill?.name}
            />
            <ReportProblemButton />
          </div>

          <ReportBreadcrumb origin={report.origin} />
        </div>
      </div>
    </div>
  );
}
