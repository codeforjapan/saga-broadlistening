import "server-only";

import { About } from "@/components/top/about";
import { Badge } from "@/components/ui/badge";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { cn } from "@/lib/utils";
import {
  showsComingSoon,
  usesThemeGrid,
} from "../../shared/utils/theme-card-view";
import type { TopTheme } from "../loaders/get-top-themes";
import { ThemeCard } from "./theme-card";
import { TopHero } from "./top-hero";

/** TOP の本文の幅（デザインの 1000px ＋ 左右の余白 24px） */
const TOP_CONTENT_CLASS = "mx-auto w-full max-w-[1048px] px-6";

interface TopPageProps {
  themes: TopTheme[];
}

/**
 * TOP ページ（Epic #162 / #155、デザイン「1. TOP」）。
 * 冒頭に CHIKAT・みてみて・きかせてを紹介するカルーセルを置き、
 * その下にテーマカードを並べる。
 */
export function TopPage({ themes }: TopPageProps) {
  const isGrid = usesThemeGrid(themes.length);

  return (
    <div className="bg-background">
      {/* TOP はヘッダーを置かないので、カルーセルがページの最上部になる */}
      <TopHero
        themes={themes}
        className="pt-5 pb-3.5 pc:pb-7"
        contentClassName={TOP_CONTENT_CLASS}
      />

      <div
        className={cn(
          TOP_CONTENT_CLASS,
          "grid gap-5 pt-[30px] pb-7 md:gap-7 md:pt-5 md:pb-12",
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
        {/* グリッド（4件以上）では出ないので、2カラムにまたがる指定は要らない */}
        {showsComingSoon(themes.length) && <ComingSoonBox />}
      </div>

      {/* About はデザインどおりスマホでは左右の余白を 16px にする */}
      <div className={cn(TOP_CONTENT_CLASS, "max-md:px-4")}>
        <About />
        <BillDisclaimer />
      </div>
    </div>
  );
}

function ComingSoonBox() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sky-200 px-4 py-6 md:flex-row md:gap-3">
      <Badge className="rounded-full bg-yellow-400 px-3 text-foreground">
        準備中
      </Badge>
      <p className="text-sm text-muted-foreground">
        ほかのテーマは今後追加予定です
      </p>
    </div>
  );
}
