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
  className?: string;
}

/**
 * きかせてボックス（緑の枠）。AIインタビューへの入口として、TOP のテーマカード・
 * 親施策ページ・トピック・レポート・まとめで同じものを使う（Epic #162 の共通ルール）。
 *
 * 枠は relative なので、カード全体をリンクにしている親（TOP のテーマカード）の
 * 疑似要素より手前に重なり、枠の中のリンクとボタンはそれぞれの遷移先が優先される。
 */
export function KikaseteBox({
  prompt,
  durationLabel,
  participantLabel,
  aboutHref,
  start,
  stacked = false,
  headingLevel: Heading = "h3",
  className,
}: KikaseteBoxProps) {
  // スマホでは「インタビューについて・みんなの声」をボタンの下に出す（案内に差し替えたときは行内のまま）
  const showAboutBelowOnMobile = aboutHref !== null && start.kind !== "guide";

  return (
    <section
      aria-label={`${SITE_NAME} きかせて`}
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl border-2 border-kikasete-400 bg-kikasete-50 p-4",
        !stacked &&
          "md:flex-row md:items-center md:justify-between md:gap-6 md:px-5",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <ChikatServiceLogo variant="kikasete" className="h-6 self-start" />
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
        "relative text-xs font-bold text-kikasete-700 underline underline-offset-4",
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

  const className = cn(
    "relative h-12 w-full px-6 has-[>svg]:px-6",
    !stacked && "md:w-auto md:shrink-0"
  );
  const content = (
    <>
      はじめる
      <ArrowRight aria-hidden="true" />
    </>
  );

  if (start.kind === "unavailable") {
    return (
      <Button type="button" variant="kikasete" disabled className={className}>
        {content}
      </Button>
    );
  }

  return (
    <Button asChild variant="kikasete" className={className}>
      <Link href={start.href as Route}>{content}</Link>
    </Button>
  );
}
