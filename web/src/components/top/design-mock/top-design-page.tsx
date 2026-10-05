import { SITE_NAME } from "@mirai-gikai/branding/site";
import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { cn } from "@/lib/utils";
import { ThemeCardList } from "./theme-card-list";
import {
  type TopAssistantBill,
  TopAssistantPane,
  TopAssistantPrompt,
} from "./top-assistant";
import type { TopDesign } from "./top-design";

interface TopDesignPageProps {
  design: TopDesign;
  currentDifficulty: DifficultyLevelEnum;
  /** 総合アシスタントに渡す施策の文脈 */
  bills: TopAssistantBill[];
}

/** タイトル。狭い幅でも句の途中で折り返さないよう、句ごとに区切って持つ */
const TOP_TITLE_PHRASES = [
  "佐賀市のこと、",
  "ちかっと知る。",
  "ちかっと話す。",
];

function TopTitle({ className }: { className?: string }) {
  return (
    <h1 className={cn("font-bold leading-normal", className)}>
      {TOP_TITLE_PHRASES.map((phrase) => (
        <span key={phrase} className="inline-block">
          {phrase}
        </span>
      ))}
    </h1>
  );
}

/**
 * TOPページのデザイン比較モック（`/?design=a` / `/?design=b`）。
 *
 * ルートの `data-top-design` は、ヘッダーとレイアウト枠（MainLayout）が
 * 案ごとの見た目に切り替えるための目印として CSS の `:has()` から参照する。
 */
export function TopDesignPage({
  design,
  currentDifficulty,
  bills,
}: TopDesignPageProps) {
  if (design === "b") {
    return (
      <div data-top-design="b" className="bg-background">
        {/* 案B：タイトル直下に総合アシスタントの入力欄を置く */}
        <Container className="flex flex-col items-center gap-8 pb-10 pt-28 text-center md:pt-12">
          <div className="flex flex-col gap-3">
            <TopTitle className="text-2xl md:text-4xl" />
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              いまは『若者支援』について、知る・話すことができます
            </p>
          </div>
          <TopAssistantPrompt
            currentDifficulty={currentDifficulty}
            bills={bills}
          />
        </Container>

        <div className="bg-linear-to-b from-secondary to-background">
          <Container className="py-10">
            <ThemeCardList />
          </Container>
        </div>

        <Container>
          <About />
          <BillDisclaimer />
        </Container>
      </div>
    );
  }

  return (
    <div data-top-design="a">
      <Container className="flex flex-col gap-8 pb-10 pt-28 md:pt-10">
        <div className="flex flex-col gap-3">
          <TopTitle className="text-2xl md:text-3xl" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {SITE_NAME}
            （チカット）は、佐賀市の今の取組を気軽に知ったり、AIと話しながら日ごろ感じていることや考えを伝えたりできる、新しい広聴のしくみです。見るだけでも、話すだけでも大丈夫です。
          </p>
        </div>
        <ThemeCardList />
      </Container>

      <Container>
        <About />
        <BillDisclaimer />
      </Container>

      {/* 案A：PCは右ペイン、スマホは右下の追従ボタンから全画面チャットを開く */}
      <TopAssistantPane currentDifficulty={currentDifficulty} bills={bills} />
    </div>
  );
}
