import { SITE_NAME } from "@mirai-gikai/branding/site";
import Image from "next/image";

/** 「みてみて」「きかせて」ロゴSVGの寸法。文中に置くので高さを行に合わせて縮小する */
const LOGO_WIDTH = 590;
const LOGO_HEIGHT = 151;

/** 説明文の中に置くロゴ。文字列の代わりに読み上げられるよう alt にロゴ名を入れる */
function InlineLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className="-mb-[2px] inline-block h-12 w-auto align-middle"
    />
  );
}

export function About() {
  return (
    <div className="py-10">
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold leading-normal">
            {SITE_NAME}について
          </h2>
          <p className="font-bold text-primary-accent">
            知るきっかけと、話すきっかけを。
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-4 text-base leading-[28px] text-black">
          <p>
            {SITE_NAME}
            は、佐賀市の取組をできるだけわかりやすく伝え、みなさんの日ごろの実感や考えを気軽に聞かせてもらうための、新しい広聴のしくみです。
          </p>
          <p>
            <InlineLogo
              src="/icons/chikat-mitemite.svg"
              alt={`${SITE_NAME}みてみて`}
            />
            では、市の今の取組を短くわかりやすく紹介。
          </p>
          <p>
            <InlineLogo
              src="/icons/chikat-kikasete.svg"
              alt={`${SITE_NAME}きかせて`}
            />
            では、AIが聞き役となって、あなたの経験や考えを少しずつ整理します。
          </p>
          <p>見るだけでも、話すだけでもかまいません。</p>
          <p>
            寄せられた声は、単に数を比べるのではなく、その背景にある理由や期待、困りごと、アイデアなどを論点として整理し、市政を考える材料にします。整理した結果は、みなさんにもわかりやすくお返ししていきます。
          </p>
          <p>
            {SITE_NAME}
            は、みなさんに使っていただきながら、より参加しやすいしくみへと育てていきます。
          </p>
        </div>
      </div>
    </div>
  );
}
