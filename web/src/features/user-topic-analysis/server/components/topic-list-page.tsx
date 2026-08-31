import "server-only";

import { Info, Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { getBillById } from "@/features/bills/server/loaders/get-bill-by-id";
import { InterviewLandingSection } from "@/features/interview-config/client/components/interview-landing-section";
import { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { policyInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { getPublicReportsByBillId } from "@/features/interview-report/server/loaders/get-public-reports-by-bill-id";
import { routes } from "@/lib/routes";
import { TopicList } from "../../client/components/topic-list";
import { getPublicTopicAnalysis } from "../loaders/get-public-topic-analysis";
import { InterviewCountPill } from "./interview-count-pill";

interface TopicListPageProps {
  billId: string;
}

export async function TopicListPage({ billId }: TopicListPageProps) {
  const [bill, analysis, reportsResult, interviewConfig] = await Promise.all([
    getBillById(billId),
    getPublicTopicAnalysis(billId),
    getPublicReportsByBillId(billId),
    getInterviewConfig(billId),
  ]);

  if (!bill) {
    notFound();
  }

  const billTitle = bill.bill_content?.title || bill.name;
  const topics = analysis?.topics ?? [];
  // 公開レポート数（管理者公開 × ユーザー公開）でピルを表示する
  const respondentCount = reportsResult.totalCount;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "施策詳細", href: routes.billDetail(billId) },
    { label: "トピック一覧" },
  ];

  return (
    <div className="min-h-dvh bg-background pt-24 md:pt-0">
      <Container>
        <div className="flex flex-col gap-8 pb-8 md:pt-8">
          {/* パンくず + 施策タイトル */}
          <div className="flex flex-col gap-2">
            <Breadcrumb items={breadcrumbItems} />
            <Link
              href={routes.billDetail(billId) as Route}
              className="inline-flex items-center gap-2 text-[15px] font-medium leading-6 text-black"
            >
              <span className="underline">{billTitle}</span>
              <Undo2 className="size-4 shrink-0" />
            </Link>
          </div>

          {/* タイトル + 件数 + 回答ピル + 説明 */}
          <div className="flex flex-col gap-4">
            <h1 className="flex items-center gap-4 font-bold leading-9 text-foreground">
              <span className="text-[22px]">💬施策のトピック一覧</span>
              <span className="text-[20px]">{topics.length}件</span>
            </h1>

            {respondentCount > 0 && (
              <InterviewCountPill
                count={respondentCount}
                href={routes.billOpinions(billId)}
              />
            )}

            <div className="flex items-center gap-2.5 rounded-[10px] bg-secondary px-3 py-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-white">
                <Info className="size-3 text-primary-accent" />
              </span>
              <p className="text-[12px] leading-5 text-foreground">
                トピックとは、インタビューに寄せられた声をAIが取りまとめて整理した
                <span className="font-bold">意見のまとめ</span>
                です。気になるトピックから、実際の意見とインタビュー会話ログまで遡れます。
              </p>
            </div>
          </div>

          {/* フィルタ + トピックカード一覧 */}
          {topics.length > 0 ? (
            <TopicList
              billId={billId}
              topics={topics}
              publicReportCount={reportsResult.totalCount}
            />
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              トピック分析は準備中です
            </p>
          )}

          {/* AIインタビューCTA */}
          {interviewConfig != null && (
            <InterviewLandingSection target={policyInterviewTarget(billId)} />
          )}
        </div>
      </Container>
    </div>
  );
}
