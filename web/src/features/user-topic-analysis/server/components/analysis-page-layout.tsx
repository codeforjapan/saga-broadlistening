import "server-only";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/components/layouts/container";
import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { InterviewLandingSection } from "@/features/interview-config/client/components/interview-landing-section";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import type { TopicAnalysisSubject } from "../../shared/utils/topic-analysis-subject";
import { TopicSubjectHeader } from "./topic-subject-header";

interface AnalysisPageLayoutProps {
  /** リンク組み立てとCTAに使う起点（施策・テーマ）。 */
  target: InterviewTarget;
  /** 見出し・戻り導線に使う対象。 */
  subject: TopicAnalysisSubject;
  /** 対象より下の階層（トピック一覧・回答一覧など）。 */
  trail: BreadcrumbItem[];
  /** 見出し（絵文字込み）と、その右に出す件数テキスト。 */
  heading: string;
  count: string;
  /** 見出し下の説明ボックスの本文。 */
  notice: ReactNode;
  /** 見出しと本文の間に差し込む要素（回答件数ピルなど）。 */
  beforeNotice?: ReactNode;
  /** 募集中なら AIインタビュー参加CTA を出す。 */
  isInterviewOpen: boolean;
  children: ReactNode;
}

/**
 * トピック一覧・トピック詳細・回答一覧で共通のページ枠。
 * パンくず／見出し／説明ボックス／参加CTAの並びと余白をここに集約する。
 */
export function AnalysisPageLayout({
  target,
  subject,
  trail,
  heading,
  count,
  notice,
  beforeNotice,
  isInterviewOpen,
  children,
}: AnalysisPageLayoutProps) {
  return (
    <div className="min-h-dvh bg-background pt-24 md:pt-0">
      <Container>
        <div className="flex flex-col gap-8 pb-8 md:pt-8">
          <TopicSubjectHeader subject={subject} trail={trail} />

          <div className="flex flex-col gap-4">
            <h1 className="flex items-center gap-4 font-bold leading-9 text-foreground">
              <span className="text-[22px]">{heading}</span>
              <span className="text-[20px]">{count}</span>
            </h1>

            {beforeNotice}

            <div className="flex items-center gap-2.5 rounded-[10px] bg-secondary px-3 py-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-white">
                <Info className="size-3 text-primary-accent" />
              </span>
              <p className="text-[12px] leading-5 text-foreground">{notice}</p>
            </div>
          </div>

          {children}

          {isInterviewOpen && <InterviewLandingSection target={target} />}
        </div>
      </Container>
    </div>
  );
}
