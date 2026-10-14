import "server-only";

import { Container } from "@/components/layouts/container";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { KikaseteBox } from "@/features/interview-config/client/components/kikasete-box";
import { getKikaseteBox } from "@/features/interview-config/server/loaders/get-kikasete-box";
import { themeInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import type { KikaseteInterview } from "@/features/interview-config/shared/utils/kikasete-interview";
import { TopicsPreviewSection } from "@/features/user-topic-analysis/server/components/topics-preview-section";
import { getTopicAnalysisContext } from "@/features/user-topic-analysis/server/loaders/get-topic-analysis-context";
import { BillDetailClient } from "../../../client/components/bill-detail/bill-detail-client";
import { BillDisclaimer } from "../../../client/components/bill-detail/bill-disclaimer";
import type { BillWithContent } from "../../../shared/types";
import type { ChildPolicyCardView } from "../../../shared/utils/child-policy-card";
import { BillShareButtons } from "../share/bill-share-buttons";
import { BillContent } from "./bill-content";
import { BillDetailHeader } from "./bill-detail-header";
import { RelatedPolicyCards } from "./related-policy-cards";

interface ParentPolicyDetailLayoutProps {
  bill: BillWithContent;
  currentDifficulty: DifficultyLevelEnum;
  childPolicies: ChildPolicyCardView[];
  /** 親施策につながるテーマ。なければきかせて・トピックの欄を出さない */
  interview: KikaseteInterview | null;
  isPreview: boolean;
}

/**
 * 親施策ページ（テーマの親ページ、#156・デザイン「2. 若者支援」）。
 * 現行の施策ページをベースに、きかせてボックス（上下2か所）・関連施策・
 * テーマのトピック一覧を足す。インタビュー・トピックは親施策につながるテーマを軸にする。
 */
export async function ParentPolicyDetailLayout({
  bill,
  currentDifficulty,
  childPolicies,
  interview,
  isPreview,
}: ParentPolicyDetailLayoutProps) {
  // テーマ型のルート（/interviews/[slug]）には preview 用の経路がないため、
  // preview でもきかせて・トピックのリンクは公開ルートを指す（参加判定だけ preview 扱いにする）
  const target = interview ? themeInterviewTarget(interview.slug) : undefined;
  const [kikaseteResult, topicContext] = await Promise.all([
    interview ? getKikaseteBox(interview, isPreview) : null,
    target ? getTopicAnalysisContext(target) : null,
  ]);
  const kikasete = kikaseteResult?.box ?? null;

  return (
    <div className="container mx-auto pb-8 max-w-4xl">
      <BillDetailClient
        bill={bill}
        currentDifficulty={currentDifficulty}
        hasInterviewConfig={interview?.isOpen ?? false}
        interviewParticipation={kikaseteResult?.participation}
        interviewTarget={target}
        chatSampleQuestions={[
          `${bill.name}のポイントは？`,
          "自分が使える制度はどれ？",
        ]}
      >
        <BillDetailHeader bill={bill} title={bill.name}>
          {kikasete && <KikaseteBox {...kikasete} />}
        </BillDetailHeader>
        <Container>
          <BillContent bill={bill} />
        </Container>
      </BillDetailClient>

      <Container>
        {childPolicies.length > 0 && (
          <div className="my-8">
            <RelatedPolicyCards policies={childPolicies} />
          </div>
        )}

        {kikasete && (
          <div className="my-8">
            <KikaseteBox {...kikasete} />
          </div>
        )}

        {/* みんなの声のまとめ（まとめ本文のプレビューは #161 で足す） */}
        {target && topicContext?.analysis && (
          <section className="my-8 flex flex-col gap-4">
            <h2 className="text-[22px] font-bold leading-9">
              みんなの声のまとめ
            </h2>
            <div className="rounded-2xl bg-white p-4 md:p-6">
              <TopicsPreviewSection
                target={target}
                topics={topicContext.analysis.topics}
                publicOpinionCount={topicContext.publicOpinionCount}
              />
            </div>
          </section>
        )}

        <div className="my-8">
          <BillShareButtons bill={bill} />
        </div>

        <div className="my-8">
          <BillDisclaimer />
        </div>
      </Container>
    </div>
  );
}
