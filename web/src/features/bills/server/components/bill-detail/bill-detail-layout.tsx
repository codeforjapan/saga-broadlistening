import "server-only";

import { Container } from "@/components/layouts/container";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewLandingSection } from "@/features/interview-config/server/components/interview-landing-section";
import { getInterviewConfig } from "@/features/interview-config/server/loaders/get-interview-config";
import { getInterviewParticipationView } from "@/features/interview-config/server/loaders/get-interview-participation-view";
import { policyInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { TopicsPreviewSection } from "@/features/user-topic-analysis/server/components/topics-preview-section";
import { getTopicAnalysisContext } from "@/features/user-topic-analysis/server/loaders/get-topic-analysis-context";
import { BillDetailClient } from "../../../client/components/bill-detail/bill-detail-client";
import { BillDisclaimer } from "../../../client/components/bill-detail/bill-disclaimer";
import type { BillWithContent } from "../../../shared/types";
import { validatePreviewToken } from "../../loaders/validate-preview-token";
import { BillShareButtons } from "../share/bill-share-buttons";
import { BillContent } from "./bill-content";
import { BillDetailHeader } from "./bill-detail-header";

interface BillDetailLayoutProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
  previewToken?: string;
}

export async function BillDetailLayout({
  bill,
  currentDifficulty,
  previewToken,
}: BillDetailLayoutProps) {
  const isPreview = await validatePreviewToken(bill.id, previewToken);
  const target = policyInterviewTarget(
    bill.id,
    isPreview ? previewToken : undefined
  );
  const [interviewConfig, topicContext] = await Promise.all([
    getInterviewConfig(bill.id),
    // トピック一覧ページと同じ経路で公開中の分析と公開意見件数を引く。
    getTopicAnalysisContext(target),
  ]);
  const interviewParticipation = interviewConfig
    ? await getInterviewParticipationView(interviewConfig, isPreview)
    : undefined;

  return (
    <div className="container mx-auto pb-8 max-w-4xl">
      {/*
        テキスト選択機能とチャット連携の実装パターン:
        - BillContentはServer Componentのまま保持（SSRによる高速な初期レンダリング）
        - BillDetailClientでクライアントサイド機能（テキスト選択、チャット連携）を提供
        - このパターンによりSSRを保持しつつインタラクティブ機能を実装
      */}
      <BillDetailClient
        bill={bill}
        currentDifficulty={currentDifficulty}
        hasInterviewConfig={interviewConfig != null}
        interviewParticipation={interviewParticipation}
        interviewTarget={target}
      >
        <BillDetailHeader
          bill={bill}
          hasInterviewConfig={interviewConfig != null}
          opinionCount={topicContext?.analysis?.total_opinions ?? 0}
          topicCount={topicContext?.analysis?.topics.length ?? 0}
        />
        <Container>
          <BillContent bill={bill} />
        </Container>
      </BillDetailClient>

      <Container>
        {/* 施策のトピック一覧（AIインタビュー意見の整理） */}
        <div className="my-8">
          <TopicsPreviewSection
            target={target}
            topics={topicContext?.analysis?.topics ?? []}
            publicOpinionCount={topicContext?.publicOpinionCount ?? 0}
          />
        </div>

        {interviewConfig != null && (
          <div className="my-8">
            <InterviewLandingSection target={target} />
          </div>
        )}
        {/* シェアボタン */}
        <div className="my-8">
          <BillShareButtons bill={bill} />
        </div>

        {/* データの出典と免責事項 */}
        <div className="my-8">
          <BillDisclaimer />
        </div>
      </Container>
    </div>
  );
}
