import "server-only";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChikatServiceLogo } from "@/components/chikat-logo";
import { Button } from "@/components/ui/button";
import { KikaseteBox } from "@/features/interview-config/client/components/kikasete-box";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { TopTheme } from "../loaders/get-top-themes";

interface ThemeCardProps {
  theme: TopTheme;
  /** 2カラムのグリッドに並べるとき。カード幅が狭いのでPCでも縦積みにする */
  stacked: boolean;
  /** ファーストビューに入るカード。バナーを優先して読み込む */
  priority?: boolean;
}

/**
 * TOP のテーマカード。バナー・概要・親施策ページへの導線と、きかせてボックスをひとまとめにする。
 * カード全体が親施策ページへのリンクで（「〜について知る」の疑似要素をカードいっぱいに広げる）、
 * きかせてボックスの中だけはインタビューへのリンクになる。
 */
export function ThemeCard({
  theme,
  stacked,
  priority = false,
}: ThemeCardProps) {
  const { interview } = theme;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-3xl bg-card shadow-lg">
      {/* 装飾のバナーなので alt は空にする */}
      <div className="relative h-30 w-full md:h-72">
        <Image
          src={theme.bannerSrc}
          alt=""
          fill
          priority={priority}
          className="object-cover"
          // TOP の本文幅は 860px（左右の余白 24px ずつを除くと 812px）。グリッドでは半分
          sizes={
            stacked
              ? "(min-width: 768px) 400px, 100vw"
              : "(min-width: 768px) 812px, 100vw"
          }
        />
      </div>

      <div className="flex flex-col gap-5 p-4 md:p-7">
        <div
          className={cn(
            "flex flex-col gap-3",
            !stacked &&
              "md:grid md:grid-cols-[1fr_auto] md:items-end md:gap-x-6"
          )}
        >
          <div className="flex flex-col items-start gap-2">
            <ChikatServiceLogo variant="mitemite" className="h-6" />
            <h2 className="text-xl font-bold leading-normal md:text-2xl">
              {theme.title}
            </h2>
          </div>
          {theme.summary && (
            <p
              className={cn(
                "text-sm leading-relaxed text-muted-foreground",
                !stacked && "md:order-last md:col-span-2"
              )}
            >
              {theme.summary}
            </p>
          )}
          <Button
            asChild
            className={cn(
              "h-12 w-full px-6 has-[>svg]:px-6 after:absolute after:inset-0",
              !stacked && "md:h-10 md:w-auto"
            )}
          >
            <Link href={routes.billDetail(theme.policyId) as Route}>
              {theme.policyName}について知る
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {interview && (
          <KikaseteBox
            prompt={interview.prompt}
            durationLabel={interview.durationLabel}
            participantLabel={interview.participantLabel}
            aboutHref={interview.aboutHref}
            start={interview.start}
            stacked={stacked}
          />
        )}
      </div>
    </article>
  );
}
