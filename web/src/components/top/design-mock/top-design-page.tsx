import { SITE_NAME } from "@mirai-gikai/branding/site";
import { Container } from "@/components/layouts/container";
import {
  ABOUT_BODY_TEXT_CLASS,
  About,
  ChikatServiceLines,
} from "@/components/top/about";
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

const TOP_INTRO = `${SITE_NAME}（チカット）は、佐賀市の今の取組を気軽に知ったり、AIと話しながら日ごろ感じていることや考えを伝えたりできる、新しい広聴のしくみです。見るだけでも、話すだけでも大丈夫です。`;

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
 * TOPページのデザイン比較モック（`/?design=a` / `/?design=b` / `/?design=c` / `/?design=d`）。
 *
 * ルートの `data-top-design` は、ヘッダーとレイアウト枠（MainLayout）が
 * 案ごとの見た目に切り替えるための目印として CSS の `:has()` から参照する。
 * `data-top-full-bleed` は、帯状の背景を画面幅いっぱいに敷く案（B・C・D）の目印。
 */
export function TopDesignPage({
  design,
  currentDifficulty,
  bills,
}: TopDesignPageProps) {
  if (design !== "a") {
    return (
      <div
        data-top-design={design}
        data-top-full-bleed
        className="bg-background"
      >
        {/*
          案B：タイトル直下に総合アシスタントの入力欄を置く。
          案C：入力欄の代わりに紹介文だけを置く。
          案D：案Cの紹介文の下に、About と同じ「みてみて」「きかせて」の説明を置く。
        */}
        <Container className="flex flex-col items-center gap-8 pb-10 pt-28 text-center md:pt-12">
          <div className="flex flex-col gap-3">
            <TopTitle className="text-2xl md:text-4xl" />
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {design === "b"
                ? "いまは『若者支援』について、知る・話すことができます"
                : TOP_INTRO}
            </p>
            {design === "d" && (
              <div className={cn("flex flex-col gap-4", ABOUT_BODY_TEXT_CLASS)}>
                <ChikatServiceLines />
              </div>
            )}
          </div>
          {design === "b" && (
            <TopAssistantPrompt
              currentDifficulty={currentDifficulty}
              bills={bills}
            />
          )}
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
            {TOP_INTRO}
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
