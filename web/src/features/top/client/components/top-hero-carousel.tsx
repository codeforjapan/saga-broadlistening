"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export type TopHeroSlide = {
  key: string;
  /** スライドを表示している間の帯の背景色（bg-*） */
  bandClass: string;
  /** 表示中のドットの色（bg-*） */
  dotClass: string;
  content: ReactNode;
};

interface TopHeroCarouselProps {
  slides: TopHeroSlide[];
  /** 帯（全幅）に足すクラス。余白など */
  className?: string;
  /** 帯の中の本文の幅。スライドの中身とドットに当てる（送りのアニメーションは画面幅いっぱいで行う） */
  contentClassName?: string;
}

/**
 * TOP 冒頭のカルーセル（デザイン「1. TOP」の色の帯）。
 * 表示中のスライドに合わせて帯の色とドットの色を切り替える。
 * スライドの中身は Server Component で組み立てて受け取る。
 */
export function TopHeroCarousel({
  slides,
  className,
  contentClassName,
}: TopHeroCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <div
      className={cn(
        "rounded-b-4xl transition-colors duration-500",
        slides[selected]?.bandClass,
        className
      )}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        aria-roledescription="カルーセル"
        aria-label="CHIKATの紹介"
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem
              key={slide.key}
              aria-roledescription="スライド"
              aria-label={`${index + 1} / ${slides.length}`}
            >
              <div className={contentClassName}>{slide.content}</div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className={cn("flex justify-center pc:mt-3", contentClassName)}>
          {slides.map((slide, index) => {
            const isCurrent = index === selected;
            return (
              <Button
                key={slide.key}
                variant="ghost"
                size="icon"
                aria-label={`${index + 1}枚目を表示`}
                aria-current={isCurrent}
                onClick={() => api?.scrollTo(index)}
                className="size-7 p-0 hover:bg-transparent pc:size-8"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all pc:h-2.5",
                    isCurrent
                      ? cn("w-[22px]", slide.dotClass)
                      : "w-2 bg-foreground/15"
                  )}
                />
              </Button>
            );
          })}
        </div>
      </Carousel>
    </div>
  );
}
