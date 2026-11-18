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
import {
  type PolicyPageKind,
  shouldShowInterviewEntry,
} from "../../../shared/utils/policy-hierarchy";
import { toRelatedLinkViews } from "../../../shared/utils/related-links-view";
import { BillShareButtons } from "../share/bill-share-buttons";
import { BillContent } from "./bill-content";
import { BillDetailHeader } from "./bill-detail-header";
import { RelatedLinks } from "./related-links";

interface BillDetailLayoutProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
  /** 子施策（施策紹介ページ）ではインタビュー導線を出さない（親施策ページに集約、#157） */
  pageKind: Exclude<PolicyPageKind, "parent">;
  isPreview: boolean;
  previewToken?: string;
}

export async function BillDetailLayout({
  bill,
  currentDifficulty,
  pageKind,
  isPreview,
  previewToken,
}: BillDetailLayoutProps) {
  const target = policyInterviewTarget(
    bill.id,
    isPreview ? previewToken : undefined
  );
  // 子施策ではインタビュー・トピックの導線を出さないので、取得もしない
  const isChild = pageKind === "child";
  const [interviewConfig, topicContext] = isChild
    ? [null, null]
    : await Promise.all([
        getInterviewConfig(bill.id),
        // トピック一覧ページと同じ経路で公開中の分析と公開意見件数を引く。
        getTopicAnalysisContext(target),
      ]);
  const showInterviewEntry = shouldShowInterviewEntry({
    pageKind,
    hasInterviewConfig: interviewConfig != null,
  });
  const interviewParticipation =
    showInterviewEntry && interviewConfig
      ? await getInterviewParticipationView(interviewConfig, isPreview)
      : undefined;
  const relatedLinks = toRelatedLinkViews(bill.related_links);

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
        hasInterviewConfig={showInterviewEntry}
        interviewParticipation={interviewParticipation}
        interviewTarget={target}
      >
        <BillDetailHeader
          bill={bill}
          hasInterviewConfig={showInterviewEntry}
          opinionCount={topicContext?.analysis?.total_opinions ?? 0}
          topicCount={topicContext?.analysis?.topics.length ?? 0}
        />
        <Container>
          <BillContent bill={bill} />
        </Container>
      </BillDetailClient>

      <Container>
        {relatedLinks.length > 0 && (
          <div className="my-8">
            <RelatedLinks links={relatedLinks} />
          </div>
        )}

        {/* 施策のトピック一覧（AIインタビュー意見の整理）。子施策では親施策ページに集約する */}
        {topicContext && (
          <div className="my-8">
            <TopicsPreviewSection
              target={target}
              topics={topicContext.analysis?.topics ?? []}
              publicOpinionCount={topicContext.publicOpinionCount}
            />
          </div>
        )}

        {showInterviewEntry && (
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
