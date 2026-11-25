import { SITE_NAME } from "@mirai-gikai/branding/site";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ChikatServiceLogo } from "@/components/chikat-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { KikaseteStart } from "../../shared/utils/kikasete-start";
import { ExternalIdentityGuideNotice } from "./external-identity-guide-notice";
import { InterviewMeta } from "./interview-meta";

interface KikaseteBoxProps {
  /** 問いかけ（例: 「若者支援について、あなたの経験や考えを聞かせてください」） */
  prompt: string;
  durationLabel: string | null;
  participantLabel: string | null;
  /** 「インタビューについて・みんなの声」（きかせてページ）。なければ出さない */
  aboutHref: string | null;
  start: KikaseteStart;
  /** 狭い枠に置くとき。PCでも縦に積む */
  stacked?: boolean;
  headingLevel?: "h2" | "h3";
  /** ロゴの高さ。並べるほかのロゴ（TOP のテーマカードのみてみて）と大きさをそろえるとき */
  logoClassName?: string;
  className?: string;
}

/**
 * きかせてボックス（緑の枠）。AIインタビューへの入口として、TOP のテーマカード・
 * 親施策ページ・トピック・レポート・まとめで同じものを使う（Epic #162 の共通ルール）。
 *
 * 枠は relative なので、カード全体をリンクにしている親（TOP のテーマカード）の
 * 疑似要素より手前に重なる。枠全体は「はじめる」（または「結果を見る」）へのリンクで
 * （ボタンの疑似要素を枠いっぱいに広げる）、「インタビューについて・みんなの声」だけは
 * その手前に重ねて自分の遷移先を優先する。
 */
export function KikaseteBox({
  prompt,
  durationLabel,
  participantLabel,
  aboutHref,
  start,
  stacked = false,
  headingLevel: Heading = "h3",
  logoClassName = "h-6",
  className,
}: KikaseteBoxProps) {
  // スマホでは「インタビューについて・みんなの声」をボタンの下に出す（案内に差し替えたときは行内のまま）
  const showAboutBelowOnMobile = aboutHref !== null && start.kind !== "guide";

  return (
    <section
      aria-label={`${SITE_NAME} きかせて`}
      className={cn(
        "theme-interview relative flex flex-col gap-4 rounded-2xl border-2 border-decor bg-secondary p-4",
        !stacked &&
          "md:flex-row md:items-center md:justify-between md:gap-6 md:px-5",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <ChikatServiceLogo
          variant="kikasete"
          className={cn("self-start", logoClassName)}
        />
        <Heading className="text-base font-bold leading-normal md:text-lg">
          {prompt}
        </Heading>
        <InterviewMeta
          durationLabel={durationLabel}
          participantLabel={participantLabel}
        >
          {aboutHref && (
            <AboutLink
              href={aboutHref}
              className={cn(showAboutBelowOnMobile && "max-md:hidden")}
            />
          )}
        </InterviewMeta>
      </div>

      <KikaseteStartAction start={start} stacked={stacked} />

      {showAboutBelowOnMobile && (
        <AboutLink href={aboutHref} className="self-center md:hidden" />
      )}
    </section>
  );
}

function AboutLink({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href as Route}
      className={cn(
        "relative z-10 text-xs font-bold text-primary-accent underline underline-offset-4",
        className
      )}
    >
      インタビューについて・みんなの声
    </Link>
  );
}

function KikaseteStartAction({
  start,
  stacked,
}: {
  start: KikaseteStart;
  stacked: boolean;
}) {
  if (start.kind === "guide") {
    return <ExternalIdentityGuideNotice participation={start.participation} />;
  }

  // 疑似要素を枠（section）いっぱいに広げ、枠全体をクリックできるようにする
  const className = cn(
    "h-12 w-full px-6 has-[>svg]:px-6 after:absolute after:inset-0",
    !stacked && "md:w-auto md:shrink-0"
  );

  return (
    <Button asChild className={className}>
      <Link href={start.href as Route}>
        {start.kind === "result" ? "結果を見る" : "はじめる"}
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  );
}
