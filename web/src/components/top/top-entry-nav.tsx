import { BookOpen, ChevronDown, MessagesSquare } from "lucide-react";
import { TOP_SECTIONS } from "@/components/top/top-sections";
import { SITE_NAME } from "@mirai-gikai/shared/site";
import { Card } from "@/components/ui/card";

const TOP_ENTRY_ITEMS = [
  {
    href: `#${TOP_SECTIONS.policy}`,
    icon: BookOpen,
    title: `${SITE_NAME}みてみて`,
    description: "市の政策や計画をわかりやすく解説。背景や論点を整理します。",
  },
  {
    href: `#${TOP_SECTIONS.interview}`,
    icon: MessagesSquare,
    title: `${SITE_NAME}きかせて`,
    description: "AIとの対話で、あなたの意見や経験を聞かせてください。",
  },
];

/**
 * ファーストビューの主要導線。
 * 「政策を知る」と「自分の声を届ける」を同列に並べ、
 * 押すと同一ページ内の対応セクションへスクロールする。
 */
export function TopEntryNav() {
  return (
    <nav aria-label="主要コンテンツ" className="grid grid-cols-2 gap-3">
      {TOP_ENTRY_ITEMS.map(({ href, icon: Icon, title, description }) => (
        <a key={href} href={href} className="block">
          <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:bg-muted/50">
            {/* サービス名入りのタイトルは幅を食うため、アイコンは上に置く */}
            <div className="flex flex-col gap-2">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary-accent"
                aria-hidden="true"
              >
                <Icon className="size-5" />
              </span>
              <p className="text-base font-bold leading-snug">{title}</p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
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
