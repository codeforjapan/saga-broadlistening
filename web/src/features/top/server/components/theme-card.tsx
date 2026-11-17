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

/** みてみて・きかせてのロゴの高さ。カードの中で同じ大きさにそろえる */
const SERVICE_LOGO_CLASS = "h-[26px] md:h-8";

interface ThemeCardProps {
  theme: TopTheme;
  /** 2カラムのグリッドに並べるとき。カード幅が狭いのでPCでも縦積みにする */
  stacked: boolean;
  /** ファーストビューに入るカード。バナーを優先して読み込む */
  priority?: boolean;
}

/**
 * TOP のテーマカード。みてみてロゴ・バナー・概要・親施策ページへの導線と、きかせてボックスをひとまとめにする。
 * カード全体が親施策ページへのリンクで（「〜について知る」の疑似要素をカードいっぱいに広げる）、
 * きかせてボックスの中だけはインタビューへのリンクになる。
 */
export function ThemeCard({
  theme,
  stacked,
  priority = false,
}: ThemeCardProps) {
  const { kikasete } = theme;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-[20px] bg-card shadow-card md:rounded-4xl">
      <div className="px-4 pt-3.5 pb-3 md:px-7 md:pt-[22px] md:pb-4">
        <ChikatServiceLogo variant="mitemite" className={SERVICE_LOGO_CLASS} />
      </div>

      {/* 装飾のバナーなので alt は空にする */}
      <div
        className={cn(
          "relative mx-3 h-[132px] overflow-hidden rounded-[14px] md:mx-5 md:rounded-[22px]",
          stacked ? "md:h-48" : "md:h-[270px]"
        )}
      >
        <Image
          src={theme.bannerSrc}
          alt=""
          fill
          priority={priority}
          className="object-cover"
          // TOP の本文幅は 1000px（カードの左右の余白 20px ずつを除くと 960px）。グリッドでは半分
          sizes={
            stacked
              ? "(min-width: 700px) 460px, 100vw"
              : "(min-width: 700px) 960px, 100vw"
          }
        />
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 px-[18px] pt-4 pb-[18px] md:gap-3.5 md:px-8 md:py-6",
          !stacked &&
            "md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-x-6"
        )}
      >
        <h2 className="text-xl font-bold leading-normal md:text-2xl">
          {theme.title}
        </h2>
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
            // きかせての「はじめる」と同じ大きさにそろえる
            !stacked && "md:w-auto"
          )}
        >
          <Link href={routes.billDetail(theme.policyId) as Route}>
            {theme.policyName}について知る
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {kikasete && (
        <div className="px-[18px] pb-5 md:px-8 md:pb-7">
          <KikaseteBox
            {...kikasete}
            stacked={stacked}
            logoClassName={SERVICE_LOGO_CLASS}
          />
        </div>
      )}
    </article>
  );
}
