import "server-only";

import { BookOpen } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import type { BillsByTag, BillWithContent } from "../../shared/types";
import { BillsByTagSection } from "./bills-by-tag-section";
import { FeaturedBillSection } from "./featured-bill-section";

interface PolicyShowcaseSectionProps {
  featuredBills: BillWithContent[];
  billsByTag: BillsByTag[];
  /** 同一ページ内リンクの飛び先にするセクションID */
  sectionId: string;
}

/**
 * 政策紹介セクション。
 * 既存の「注目の施策」「タグ別一覧」をまとめ、政策紹介であることを見出しで示す。
 */
export function PolicyShowcaseSection({
  featuredBills,
  billsByTag,
  sectionId,
}: PolicyShowcaseSectionProps) {
  return (
    <section id={sectionId} className="flex scroll-mt-24 flex-col gap-10">
      <SectionHeading
        icon={<BookOpen className="size-6" />}
        title="政策紹介"
        description="市で検討されている政策や計画のポイントを、やさしく解説します。"
      />

      <FeaturedBillSection bills={featuredBills} />
      <BillsByTagSection billsByTag={billsByTag} />
    </section>
  );
}
