import { MUNICIPALITY_NAME } from "@mirai-gikai/branding/site";
import { ChevronDown } from "lucide-react";
import { TOP_SECTIONS } from "@/components/top/top-sections";
import { Card } from "@/components/ui/card";

const TOP_ENTRY_ITEMS = [
  {
    href: `#${TOP_SECTIONS.policy}`,
    title: "施策紹介",
    description: `${MUNICIPALITY_NAME}の今の取組を、1〜2分で手短に紹介。背景や暮らしとのつながりも、できるだけわかりやすくお伝えします。`,
  },
  {
    href: `#${TOP_SECTIONS.interview}`,
    title: "AIインタビュー",
    description:
      "日ごろ感じていることを、AIに話してみませんか。AIが聞き役になって、あなたの経験や考えを少しずつ整理します。",
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
