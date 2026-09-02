import { SITE_NAME } from "@mirai-gikai/branding/site";
import Image from "next/image";
import { Container } from "@/components/layouts/container";
import { TopEntryNav } from "@/components/top/top-entry-nav";

export function Hero() {
  return (
    <div className="flex w-full flex-col">
      {/* 背景画像。装飾なので alt は空にする */}
      <div className="relative h-40 w-full sm:h-52">
        <Image
          src="/img/hero_background.png"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
          quality={60}
        />
      </div>

      <Container className="flex flex-col gap-5 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold leading-relaxed md:text-2xl">
            まちのこと、
            <br className="sm:hidden" />
            ちかっと知る。ちかっと話す。
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {SITE_NAME}
            （チカット）は、佐賀市の今の取組を気軽に知ったり、AIと話しながら日ごろ感じていることや考えを伝えたりできる、新しい広聴のしくみです。見るだけでも、話すだけでも大丈夫です。
          </p>
        </div>

        <TopEntryNav />
      </Container>
    </div>
  );
}
