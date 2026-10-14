import "server-only";

import { SITE_NAME } from "@mirai-gikai/branding/site";
import { About } from "@/components/top/about";
import { Badge } from "@/components/ui/badge";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { cn } from "@/lib/utils";
import { usesThemeGrid } from "../../shared/utils/theme-card-view";
import type { TopTheme } from "../loaders/get-top-themes";
import { ThemeCard } from "./theme-card";

/** タイトル。狭い幅でも句の途中で折り返さないよう、句ごとに区切って持つ */
const TOP_TITLE_PHRASES = [
  "佐賀市のこと、",
  "ちかっと知る。",
  "ちかっと話す。",
];

const TOP_INTRO = `${SITE_NAME}（チカット）は、佐賀市の今の取組を気軽に知ったり、AIと話しながら日ごろ感じていることや考えを伝えたりできる、新しい広聴のしくみです。見るだけでも、話すだけでも大丈夫です。`;

/** TOP の本文の幅（デザインの 860px） */
const TOP_CONTENT_CLASS = "mx-auto w-full max-w-[860px] px-4 md:px-6";

interface TopPageProps {
  themes: TopTheme[];
}

/**
 * TOP ページ（Epic #162 / #155、デザイン「1. TOP」）。
 * タイトル直下は紹介文だけを置き（AIチャットの入力欄は置かない）、
 * その下にテーマカードを並べる。
 */
export function TopPage({ themes }: TopPageProps) {
  const isGrid = usesThemeGrid(themes.length);

  return (
    <div className="bg-background">
      <div
        className={cn(
          TOP_CONTENT_CLASS,
          "flex flex-col gap-3 pt-28 pb-10 md:pt-12"
        )}
      >
        <h1 className="text-2xl font-bold leading-normal md:text-4xl">
          {TOP_TITLE_PHRASES.map((phrase) => (
            <span key={phrase} className="inline-block">
              {phrase}
            </span>
          ))}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          {TOP_INTRO}
        </p>
      </div>

      <div className="bg-linear-to-b from-secondary to-background">
        <div
          className={cn(
            TOP_CONTENT_CLASS,
            "grid gap-6 py-10",
            isGrid && "md:grid-cols-2"
          )}
        >
          {themes.map((theme, index) => (
            <ThemeCard
              key={theme.policyId}
              theme={theme}
              stacked={isGrid}
              // グリッドでは2枚目までがファーストビューに入る
              priority={index < (isGrid ? 2 : 1)}
            />
          ))}
          <ComingSoonBox className={cn(isGrid && "md:col-span-2")} />
        </div>
      </div>

      <div className={TOP_CONTENT_CLASS}>
        <About />
        <BillDisclaimer />
      </div>
    </div>
  );
}

function ComingSoonBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sky-200 px-4 py-6 md:flex-row md:gap-3",
        className
      )}
    >
      <Badge className="rounded-full bg-yellow-400 px-3 text-foreground">
        準備中
      </Badge>
      <p className="text-sm text-muted-foreground">
        ほかのテーマは今後追加予定です
      </p>
    </div>
  );
}
