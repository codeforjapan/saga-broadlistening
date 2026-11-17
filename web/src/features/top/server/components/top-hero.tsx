import "server-only";

import { SITE_NAME } from "@mirai-gikai/branding/site";
import Image from "next/image";
import type { ReactNode } from "react";
import { ChikatServiceLogo } from "@/components/chikat-logo";
import { logoImageProps } from "@/lib/logo";
import { cn } from "@/lib/utils";
import {
  TopHeroCarousel,
  type TopHeroSlide,
} from "../../client/components/top-hero-carousel";
import type { TopTheme } from "../loaders/get-top-themes";

/** スライドの見出し。中身は句ごとに inline-block の span で区切り、句の途中で折り返さないようにする */
const HEADING_CLASS =
  "mt-[18px] font-heading text-[22px] font-bold leading-[1.45] tracking-wide pc:mt-[22px] pc:text-4xl pc:leading-[1.4]";

const LEAD_CLASS =
  "mt-2.5 text-[13.5px] leading-[1.7] text-muted-foreground pc:mt-3.5 pc:text-[17px] pc:leading-[1.8]";

/** 「…」の3つの点 */
const DOT_KEYS = [0, 1, 2];

/** 「…」入りの小さな吹き出し。位置・大きさ・角の向き・色は className で指定する */
function DotBubble({
  className,
  dotClassName,
}: {
  className: string;
  dotClassName: string;
}) {
  return (
    <div
      className={cn(
        "absolute flex items-center justify-center gap-[5px]",
        className
      )}
    >
      {DOT_KEYS.map((i) => (
        <span key={i} className={cn("size-1.5 rounded-full", dotClassName)} />
      ))}
    </div>
  );
}

/** 装飾のテーマカード（PCのスライド右側）。バナーとタイトルは実際のテーマから取る */
function MiniThemeCard({
  theme,
  withLogo = false,
  className,
}: {
  theme: TopTheme;
  withLogo?: boolean;
  className: string;
}) {
  return (
    <div
      className={cn(
        "absolute overflow-hidden rounded-2xl bg-card shadow-lg",
        className
      )}
    >
      <div className="px-3 pt-2.5 pb-2">
        {withLogo && <ChikatServiceLogo variant="mitemite" className="h-4" />}
      </div>
      <div
        className={cn(
          "relative mx-2.5 overflow-hidden rounded-[10px]",
          withLogo ? "h-[110px]" : "h-[92px]"
        )}
      >
        <Image
          src={theme.bannerSrc}
          alt=""
          fill
          // PC でしか見えない装飾。スマホでは最小の画像だけを読み込ませる
          sizes="(min-width: 1000px) 250px, 1px"
          className="object-cover"
        />
      </div>
      <p className="px-3 pt-2.5 pb-3.5 text-[13px] font-bold leading-normal">
        {theme.title}
      </p>
    </div>
  );
}

interface SlideProps {
  logo: ReactNode;
  heading: ReactNode;
  lead: ReactNode;
  /** スマホ（pc 未満）で右上に置く小さな装飾 */
  smallDecor?: ReactNode;
  /** PC で右側に置く装飾（420×320）。隣のスライドに見えないよう枠からはみ出さない */
  decor: ReactNode;
}

function Slide({ logo, heading, lead, smallDecor, decor }: SlideProps) {
  return (
    <div className="relative min-h-[214px] pc:flex pc:min-h-80 pc:items-center pc:gap-10">
      <div className="pc:w-[540px] pc:shrink-0">
        <div className="flex h-14 items-end pc:h-20">{logo}</div>
        {heading}
        <p className={LEAD_CLASS}>{lead}</p>
      </div>
      {smallDecor && (
        <div
          aria-hidden="true"
          className="absolute top-[58px] right-0 h-24 w-[100px] pc:hidden"
        >
          {smallDecor}
        </div>
      )}
      <div
        aria-hidden="true"
        className="relative hidden h-80 w-[420px] shrink-0 pc:block"
      >
        {decor}
      </div>
    </div>
  );
}

function IntroSlide({ themes }: { themes: TopTheme[] }) {
  const [first, second] = themes;
  return (
    <Slide
      logo={
        <Image
          alt={SITE_NAME}
          {...logoImageProps("full", 80)}
          priority
          className="h-14 w-auto pc:h-20"
        />
      }
      heading={
        <h1 className={HEADING_CLASS}>
          <span className="inline-block">佐賀市のこと、</span>
          <br />
          <span className="inline-block text-sky-700">ちかっと知る。</span>
          <span className="inline-block text-kikasete-600">ちかっと話す。</span>
        </h1>
      }
      lead={
        <>
          市の取組を知る、あなたの声も伝える。
          <br className="pc:hidden" />
          どちらも気軽に、ここから。
        </>
      }
      decor={
        <>
          {second && (
            <MiniThemeCard
              theme={second}
              className="top-[58px] left-[150px] z-10 w-[200px] rotate-[5deg]"
            />
          )}
          {first && (
            <MiniThemeCard
              theme={first}
              className="top-[30px] left-2.5 z-20 w-[200px] -rotate-[4deg]"
            />
          )}
          <DotBubble
            className="top-2 left-[318px] h-[52px] w-[78px] rotate-[6deg] gap-1.5 rounded-[26px] rounded-bl-sm bg-yellow-400"
            dotClassName="bg-yellow-700"
          />
          <DotBubble
            className="top-[236px] left-[300px] h-[58px] w-[92px] -rotate-[4deg] gap-[7px] rounded-[29px] rounded-tl-sm bg-kikasete-400"
            dotClassName="bg-base-white"
          />
          <div className="absolute top-[262px] -left-1.5 h-[30px] w-11 -rotate-[6deg] rounded-[15px] rounded-br-sm bg-sky-200" />
          <div className="absolute top-[94px] left-[372px] size-3 rounded-full bg-sky-400" />
          <div className="absolute top-2.5 left-[268px] size-2.5 rounded-full bg-kikasete-400" />
        </>
      }
    />
  );
}

function MitemiteSlide({ themes }: { themes: TopTheme[] }) {
  const [first] = themes;
  return (
    <Slide
      logo={<ChikatServiceLogo variant="mitemite" className="h-10 pc:h-14" />}
      heading={
        <p className={HEADING_CLASS}>
          <span className="inline-block">市の取り組みを、</span>
          <br />
          <span className="inline-block text-sky-700">サッと知る。</span>
        </p>
      }
      lead="1〜2分で読める、やさしい施策紹介。"
      smallDecor={
        <>
          <div className="absolute top-[52px] left-2.5 flex -rotate-[6deg] gap-[3px]">
            <BookPage className="rounded-l-xl rounded-r-[3px]" />
            <BookPage className="rounded-l-[3px] rounded-r-xl" />
          </div>
          <div className="absolute top-[40px] left-[42px] size-1.5 rounded-full bg-yellow-400" />
          <div className="absolute top-8 left-[46px] size-2 rounded-full bg-yellow-400" />
          <DotBubble
            className="top-0 left-14 h-7 w-10 gap-1 rounded-[14px] rounded-bl-sm bg-yellow-400"
            dotClassName="size-[5px] bg-yellow-700"
          />
        </>
      }
      decor={
        <>
          {first && (
            <MiniThemeCard
              theme={first}
              withLogo
              className="top-[66px] left-2.5 z-10 w-[250px] -rotate-[3deg]"
            />
          )}
          <div className="absolute top-[60px] left-[186px] size-2 rounded-full bg-yellow-400" />
          <div className="absolute top-[46px] left-[195px] size-[11px] rounded-full bg-yellow-400" />
          <div className="absolute -top-0.5 right-0 flex h-12 w-[214px] items-center justify-center rounded-3xl rounded-bl-sm bg-yellow-400 text-[14.5px] font-bold whitespace-nowrap">
            AIが質問に答えてくれる！
          </div>
          <DotBubble
            className="top-[236px] left-[318px] h-10 w-[60px] gap-[5px] rounded-[20px] rounded-tl-sm bg-sky-400"
            dotClassName="bg-base-white"
          />
          <div className="absolute top-[30px] left-1.5 size-3 rounded-full bg-sky-200" />
          <div className="absolute top-[120px] left-[372px] size-2.5 rounded-full bg-kikasete-400" />
        </>
      }
    />
  );
}

/** 開いた本のページ（スマホの装飾） */
function BookPage({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "flex h-10 w-[30px] flex-col items-center justify-center gap-[5px] bg-sky-400",
        className
      )}
    >
      {DOT_KEYS.map((i) => (
        <span
          key={i}
          className="block h-[3px] w-4 rounded-sm bg-base-white/90"
        />
      ))}
    </div>
  );
}

/** きかせてスライド（PC）の会話の例 */
const CHAT_BUBBLES = [
  {
    text: "最近、佐賀で暮らしていて思うことはありますか？",
    className: "top-[34px] left-0 w-[300px] rounded-bl-md bg-card",
  },
  {
    text: "夜のバス、もう少しあったらなぁ…",
    className:
      "top-[130px] left-[124px] w-[276px] rounded-br-md bg-kikasete-600 font-bold text-base-white",
  },
  {
    text: "ありがとうございます。どんな時に困りますか？",
    className: "top-[214px] left-0 w-[280px] rounded-bl-md bg-card",
  },
];

const CHAT_BUBBLE_CLASS =
  "absolute box-border rounded-[22px] px-[18px] py-3 text-[15px] leading-[1.55] shadow-md";

function KikaseteSlide() {
  return (
    <Slide
      logo={<ChikatServiceLogo variant="kikasete" className="h-11 pc:h-16" />}
      heading={
        <p className={HEADING_CLASS}>
          <span className="inline-block">思っていることを、</span>
          <br />
          <span className="inline-block text-kikasete-600">話すだけ。</span>
        </p>
      }
      lead="AIが聞き役になって、考えを整理。"
      smallDecor={
        <>
          <DotBubble
            className="top-[30px] left-1.5 h-10 w-[62px] -rotate-[4deg] gap-[5px] rounded-[20px] rounded-bl-sm bg-kikasete-400"
            dotClassName="bg-base-white"
          />
          <DotBubble
            className="top-1.5 left-14 h-[26px] w-[38px] rotate-[6deg] gap-[3px] rounded-[13px] rounded-br-sm bg-sky-400"
            dotClassName="size-1 bg-base-white"
          />
          <div className="absolute top-[66px] left-[66px] h-[18px] w-[26px] -rotate-[6deg] rounded-[9px] rounded-tl-sm bg-yellow-400" />
          <div className="absolute top-2.5 left-0.5 size-[9px] rounded-full bg-sky-200" />
        </>
      }
      decor={
        <>
          {CHAT_BUBBLES.map((bubble) => (
            <div
              key={bubble.text}
              className={cn(CHAT_BUBBLE_CLASS, bubble.className)}
            >
              {bubble.text}
            </div>
          ))}
          <DotBubble
            className="top-2.5 left-[330px] h-10 w-[60px] rotate-[6deg] gap-[5px] rounded-[20px] rounded-bl-sm bg-yellow-400"
            dotClassName="bg-yellow-700"
          />
          <DotBubble
            className="top-[262px] left-[330px] h-8 w-12 -rotate-[4deg] gap-1 rounded-2xl rounded-tl-sm bg-sky-400"
            dotClassName="size-[5px] bg-base-white"
          />
          <div className="absolute top-14 left-[300px] size-2.5 rounded-full bg-sky-200" />
        </>
      }
    />
  );
}

interface TopHeroProps {
  themes: TopTheme[];
  className?: string;
  contentClassName?: string;
}

/**
 * TOP 冒頭のカルーセル（デザイン「1. TOP」）。
 * 1枚目: CHIKAT の紹介（ページの h1）、2枚目: みてみて、3枚目: きかせて。
 */
export function TopHero({ themes, className, contentClassName }: TopHeroProps) {
  const slides: TopHeroSlide[] = [
    {
      key: "intro",
      bandClass: "bg-background",
      dotClass: "bg-sky-400",
      content: <IntroSlide themes={themes} />,
    },
    {
      key: "mitemite",
      bandClass: "bg-sky-50",
      dotClass: "bg-sky-400",
      content: <MitemiteSlide themes={themes} />,
    },
    {
      key: "kikasete",
      bandClass: "bg-kikasete-50",
      dotClass: "bg-kikasete-400",
      content: <KikaseteSlide />,
    },
  ];

  return (
    <TopHeroCarousel
      slides={slides}
      className={className}
      contentClassName={contentClassName}
    />
  );
}
