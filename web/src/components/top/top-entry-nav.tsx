import { ChevronDown } from "lucide-react";
import { TOP_SECTIONS } from "@/components/top/top-sections";
import { Card } from "@/components/ui/card";

const TOP_ENTRY_ITEMS = [
  {
    href: `#${TOP_SECTIONS.interview}`,
    title: "AIインタビュー",
    description: "AIとの対話で、あなたの意見や経験を聞かせてください。",
  },
  {
    href: `#${TOP_SECTIONS.policy}`,
    title: "施策紹介",
    description: "市の施策や計画をわかりやすく解説。背景や論点を整理します。",
  },
];

/**
 * ファーストビューの主要導線。
 * 「施策を知る」と「自分の声を届ける」を同列に並べ、
 * 押すと同一ページ内の対応セクションへスクロールする。
 */
export function TopEntryNav() {
  return (
    <nav aria-label="主要コンテンツ" className="grid grid-cols-2 gap-3">
      {TOP_ENTRY_ITEMS.map(({ href, title, description }) => (
        <a key={href} href={href} className="block">
          <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-muted/50">
            {/* ロゴ画像は使わずCSSの文字組みで見せる。
                字面・サイズはセクション見出し（SectionHeading）に揃える */}
            <p className="text-balance text-[22px] font-bold leading-[1.48] text-primary-accent">
              {title}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            {/* 同一ページ内の対応セクションへ下るという合図 */}
            <ChevronDown
              className="mt-auto size-5 self-center text-primary-accent"
              aria-hidden="true"
            />
          </Card>
        </a>
      ))}
    </nav>
  );
}
