import "server-only";

import { notFound } from "next/navigation";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { RespondentList } from "../../client/components/respondent-list";
import { getPublicRespondents } from "../loaders/get-public-respondents";
import { getTopicAnalysisSubject } from "../loaders/get-topic-analysis-subject";
import { AnalysisPageLayout } from "./analysis-page-layout";

interface OpinionsPageProps {
  /** 回答一覧の起点。施策配下・テーマ配下のどちらから来たかで戻り導線が変わる */
  target: InterviewTarget;
}

/**
 * AIインタビューの回答一覧（回答者1人＝1カード）。
 *
 * 回答は意見募集（テーマ）単位に集まるため、施策配下（/bills/[id]/opinions）と
 * テーマ配下（/interviews/[slug]/opinions）の両方から同じ画面を出す。
 * 公開意見が k-匿名性しきい値未満のテーマでは getPublicRespondents が空を返す。
 */
export async function OpinionsPage({ target }: OpinionsPageProps) {
  // 回答一覧はトピックを描かないので、重い分析取得を含む context は使わない。
  const context = await getTopicAnalysisSubject(target);

  if (!context) {
    notFound();
  }

  const respondents = context.interviewConfigId
    ? await getPublicRespondents(context.interviewConfigId)
    : [];

  return (
    <AnalysisPageLayout
      target={target}
      subject={context.subject}
      trail={[{ label: "インタビュー回答一覧" }]}
      heading="👫AIインタビューの回答一覧"
      count={`${respondents.length}人`}
      notice="実際に回答された一人ひとりのAIインタビューの内容と、会話ログを読むことができます。公開に同意されたインタビュー回答のみ掲載しています。"
      isInterviewOpen={context.isInterviewOpen}
    >
      {respondents.length > 0 ? (
        // 相対日時はサーバーで基準時刻を固定し、クライアントでの再計算ずれを防ぐ。
        <RespondentList respondents={respondents} nowMs={Date.now()} />
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          公開されている回答はまだありません
        </p>
      )}
    </AnalysisPageLayout>
  );
}
