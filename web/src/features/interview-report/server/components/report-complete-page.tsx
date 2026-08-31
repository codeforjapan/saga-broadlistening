import "server-only";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { getBillDetailLink } from "@/features/interview-config/shared/utils/interview-links";
import { PublicStatusSection } from "@/features/interview-report/client/components/public-status-section";
import { getInterviewReportById } from "@/features/interview-report/server/loaders/get-interview-report-by-id";
import { getInterviewMessages } from "@/features/interview-session/server/loaders/get-interview-messages";
import { ReportContent } from "../../shared/components/report-content";
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

  const billId = report.bill_id;

  // 施策・メッセージ・論点単位の意見を並列取得
  const [bill, messages, opinions] = await Promise.all([
    getBillById(billId),
    getInterviewMessages(report.interview_session_id),
    getReportOpinions(reportId),
  ]);

  if (!bill) {
    notFound();
  }

  const characterCount = countCharacters(messages);
  const billName = bill.bill_content?.title || bill.name;

  return (
    <div className="min-h-dvh bg-background">
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
        </div>
      </div>

      {/* インタビューレポートセクション */}
      <div className="px-4 py-8">
        <div className="flex flex-col gap-9">
          {/* セクションタイトルと公開ステータス */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-black">
              インタビューレポート
            </h2>
            <Link
              href={getBillDetailLink(billId) as Route}
              className="text-sm text-black underline"
            >
              {billName}
            </Link>
            <PublicStatusSection
              sessionId={report.interview_session_id}
              initialIsPublic={report.is_public_by_user}
            />
          </div>

          {/* レポート本体（共通コンポーネント） */}
          <ReportContent
            reportId={reportId}
            billId={billId}
            from="complete"
            summary={report.summary}
            roleTitle={report.role_title}
            sessionStartedAt={report.session_started_at}
            characterCount={characterCount}
            messages={messages}
            roleDescription={report.role_description}
            opinions={opinions}
          />
        </div>
      </div>
    </div>
  );
}
