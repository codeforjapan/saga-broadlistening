import "server-only";

import { Undo2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import type { TopicAnalysisSubject } from "../../shared/utils/topic-analysis-subject";

interface TopicSubjectHeaderProps {
  /** 意見を寄せる対象（施策 or テーマ）。名前と戻り先に使う。 */
  subject: TopicAnalysisSubject;
  /** 対象より下の階層（トピック一覧・トピック詳細）。 */
  trail: BreadcrumbItem[];
}

/** トピック分析ページ共通の「パンくず + 対象名への戻りリンク」。 */
export function TopicSubjectHeader({
  subject,
  trail,
}: TopicSubjectHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <Breadcrumb
        items={[{ label: subject.label, href: subject.href }, ...trail]}
      />
      <Link
        href={subject.href as Route}
        className="inline-flex items-center gap-2 text-[15px] font-medium leading-6 text-black"
      >
        <span className="underline">{subject.name}</span>
        <Undo2 className="size-4 shrink-0" />
      </Link>
    </div>
  );
}
