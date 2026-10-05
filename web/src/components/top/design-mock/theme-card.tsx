import { SITE_NAME } from "@mirai-gikai/branding/site";
import { ArrowRight, Clock, User } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { logoImageProps } from "@/lib/logo";
import { cn } from "@/lib/utils";
import type { TopTheme } from "./top-themes";

interface ThemeCardProps {
  theme: TopTheme;
  /** 2カラムのグリッドに並べるとき。カード幅が狭いのでPCでも縦積みにする */
  stacked: boolean;
  /** ファーストビューに入るカード。バナーを優先して読み込む */
  priority?: boolean;
}

const KIKASETE_LABEL = `${SITE_NAME} きかせて`;

/**
 * リンク先があればリンク、なければ押せないボタンとして出す。
 * スマホでは横幅いっぱい・高さ48px。
 * リンクのときは疑似要素を最寄りの relative な祖先いっぱいに広げ、
 * ボタンの周りのテキストごと押せるようにする。
 */
function ThemeLinkButton({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: ReactNode;
}) {
  const buttonClassName = cn("h-12 w-full px-6 has-[>svg]:px-6", className);
  const content = (
    <>
      {children}
      <ArrowRight aria-hidden="true" />
    </>
  );

  if (href == null) {
    return (
      <Button type="button" disabled className={buttonClassName}>
        {content}
      </Button>
    );
  }

  return (
    <Button
      asChild
      className={cn(buttonClassName, "after:absolute after:inset-0")}
    >
      <Link href={href as Route}>{content}</Link>
    </Button>
  );
}

/** テーマカード。バナー・概要・テーマページへの導線と「きかせて」枠をひとまとめにする */
export function ThemeCard({
  theme,
  stacked,
  priority = false,
}: ThemeCardProps) {
  const { interview } = theme;

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-raised">
      {/* 装飾のバナーなので alt は空にする */}
      <div className="relative aspect-[3/1] w-full">
        <Image
          src={theme.bannerSrc}
          alt=""
          fill
          priority={priority}
          className="object-cover"
          sizes="(min-width: 1000px) 850px, (min-width: 700px) 700px, 100vw"
        />
      </div>

      <div className="flex flex-col gap-5 p-4 md:p-7">
        <div
          className={cn(
            "relative flex flex-col gap-4",
            !stacked &&
              "md:grid md:grid-cols-[1fr_auto] md:items-end md:gap-x-6"
          )}
        >
          <div className="flex flex-col items-start gap-3">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
              {theme.tag}
            </span>
            <h2 className="text-xl font-bold leading-normal md:text-2xl">
              {theme.title}
            </h2>
          </div>
          <p
            className={cn(
              "leading-[1.9] text-muted-foreground",
              !stacked && "md:order-last md:col-span-2"
            )}
          >
            {theme.description}
          </p>
          <ThemeLinkButton
            href={theme.pageHref}
            className={cn(!stacked && "md:w-auto")}
          >
            {theme.tag}について知る
          </ThemeLinkButton>
        </div>

        <section
          aria-label={KIKASETE_LABEL}
          className={cn(
            "relative flex flex-col gap-4 rounded-2xl border-2 border-kikasete bg-kikasete-surface p-4",
            !stacked &&
              "md:flex-row md:items-center md:justify-between md:gap-6 md:px-5"
          )}
        >
          <div className="flex flex-col gap-2">
            {/* 「CHIKAT きかせて」ロゴの組み方に寄せ、ロゴの横に小さな墨色の文字をワードマークの下端で揃える */}
            <p className="flex items-end gap-1 text-[10px] font-bold leading-none text-foreground">
              <Image alt={SITE_NAME} {...logoImageProps("compact", 24)} />
              <span className="pb-[6px]">きかせて</span>
            </p>
            <h3 className="text-base font-bold leading-normal md:text-lg">
              {interview.title}
            </h3>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {interview.duration}
              </span>
              <span className="flex items-center gap-1">
                <User className="size-3.5" aria-hidden="true" />
                {interview.participantCount}人が参加
              </span>
            </p>
          </div>
          <ThemeLinkButton
            href={interview.href}
            className={cn("bg-kikasete text-white", !stacked && "md:w-auto")}
          >
            インタビューに答える
          </ThemeLinkButton>
        </section>
      </div>
    </article>
  );
}
