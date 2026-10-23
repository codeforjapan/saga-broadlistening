import "server-only";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import type { KikaseteBoxData } from "@/features/interview-config/server/loaders/get-kikasete-box";
import type { TopicAnalysisSubject } from "../../shared/utils/topic-analysis-subject";
import { TopicSubjectHeader } from "./topic-subject-header";
import { VoicesPageFrame } from "./voices-page-frame";

interface AnalysisPageLayoutProps {
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
  /** ページ下部のきかせてボックス。募集中でなければ null。 */
  kikasete: KikaseteBoxData | null;
  children: ReactNode;
}

/**
 * トピック一覧・トピック詳細・回答一覧で共通のページ枠。
 * パンくず／見出し／説明ボックス／きかせてボックスの並びと余白をここに集約する。
 */
export function AnalysisPageLayout({
  subject,
  trail,
  heading,
  count,
  notice,
  beforeNotice,
  kikasete,
  children,
}: AnalysisPageLayoutProps) {
  return (
    <VoicesPageFrame kikasete={kikasete}>
      <TopicSubjectHeader subject={subject} trail={trail} />

      <div className="flex flex-col gap-4">
        <h1 className="flex items-center gap-4 font-bold leading-9 text-foreground">
          <span className="text-[22px]">{heading}</span>
          <span className="text-[20px]">{count}</span>
        </h1>

        {beforeNotice}

        <div className="flex items-center gap-2.5 rounded-[10px] bg-yellow-400/20 px-3 py-2.5">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-white">
            <Info className="size-3 text-yellow-700" />
          </span>
          <p className="text-[12px] leading-5 text-foreground">{notice}</p>
        </div>
      </div>

      {children}
    </VoicesPageFrame>
  );
}
