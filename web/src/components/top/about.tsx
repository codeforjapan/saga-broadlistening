import { SITE_NAME } from "@mirai-gikai/branding/site";
import { ChikatServiceLogo } from "@/components/chikat-logo";
import { cn } from "@/lib/utils";

/** 説明文の中に置くロゴ。高さを行に合わせて縮小する */
const INLINE_LOGO_CLASS = "mb-1 inline-block h-12 align-middle";

/** 本文の文字組み */
const ABOUT_BODY_TEXT_CLASS = "text-base leading-[28px] text-foreground";

/** 「みてみて」「きかせて」それぞれを1段落ずつ、ロゴ入りで紹介する */
function ChikatServiceLines() {
  return (
    <>
      <p>
        <ChikatServiceLogo variant="mitemite" className={INLINE_LOGO_CLASS} />
        では、市の今の取組を短くわかりやすく紹介。
      </p>
      <p>
        <ChikatServiceLogo
          variant="kikasete"
          className={cn(INLINE_LOGO_CLASS, "mb-[11px]")}
        />
        では、AIが聞き役となって、あなたの経験や考えを少しずつ整理します。
      </p>
    </>
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
        <div className={cn("flex flex-col gap-4", ABOUT_BODY_TEXT_CLASS)}>
          <p>
            {SITE_NAME}
            （チカット）は、佐賀市の取組をできるだけわかりやすく伝え、みなさんの日ごろの実感や考えを気軽に聞かせてもらうための、新しい広聴のしくみです。
          </p>
          <ChikatServiceLines />
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
