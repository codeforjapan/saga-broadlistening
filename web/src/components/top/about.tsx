import { MUNICIPALITY_NAME, SITE_NAME } from "@mirai-gikai/branding/site";

export function About() {
  return (
    <div className="py-10">
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[32px] font-extrabold leading-none tracking-[0.02em] text-foreground">
            About
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            本システムについて
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-bold leading-[43.2px]">
              知るきっかけと、話すきっかけを。
            </h3>
            <div className="flex flex-col gap-4 text-[15px] leading-[28px] text-black">
              <p>
                {SITE_NAME}は、{MUNICIPALITY_NAME}
                の取組をできるだけわかりやすく伝え、みなさんの日ごろの実感や考えを気軽に聞かせてもらうための、新しい広聴のしくみです。
              </p>
              <p>
                「施策紹介」では、市の今の取組を短くわかりやすく紹介。
                <br />
                「AIインタビュー」では、AIが聞き役となって、あなたの経験や考えを少しずつ整理します。見るだけでも、話すだけでもかまいません。
              </p>
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
      </div>
    </div>
  );
}
