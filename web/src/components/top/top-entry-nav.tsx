import { SITE_NAME } from "@mirai-gikai/shared/site";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { TOP_SECTIONS } from "@/components/top/top-sections";
import { Card } from "@/components/ui/card";

const TOP_ENTRY_ITEMS = [
  {
    href: `#${TOP_SECTIONS.interview}`,
    logo: "/icons/chikat-kikasete.svg",
    logoAlt: `${SITE_NAME}きかせて`,
    title: "AIインタビュー",
    description: "AIとの対話で、あなたの意見や経験を聞かせてください。",
  },
  {
    href: `#${TOP_SECTIONS.policy}`,
    logo: "/icons/chikat-mitemite.svg",
    logoAlt: `${SITE_NAME}みてみて`,
    title: "施策紹介",
    description: "市の施策や計画をわかりやすく解説。背景や論点を整理します。",
  },
];

/** ロゴSVGの余白を切り詰めたあとの寸法。カード幅に合わせて縮小して使う */
const LOGO_WIDTH = 590;
const LOGO_HEIGHT = 151;

/**
 * ファーストビューの主要導線。
 * 「施策を知る」と「自分の声を届ける」を同列に並べ、
 * 押すと同一ページ内の対応セクションへスクロールする。
 */
export function TopEntryNav() {
  return (
    <nav aria-label="主要コンテンツ" className="grid grid-cols-2 gap-3">
      {TOP_ENTRY_ITEMS.map(({ href, logo, logoAlt, title, description }) => (
        <a key={href} href={href} className="block">
          <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-muted/50">
            {/* 横長のロゴなのでカード幅いっぱいに置き、その下にタイトルを並べる */}
            <div className="flex flex-col gap-2">
              <Image
                src={logo}
                alt={logoAlt}
                width={LOGO_WIDTH}
                height={LOGO_HEIGHT}
                className="h-auto w-full"
                priority
              />
              {/* セクション見出し（SectionHeading）と同じ字面・サイズに揃える */}
              <p className="text-balance text-[22px] font-bold leading-[1.48]">
                {title}
              </p>
            </div>
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
