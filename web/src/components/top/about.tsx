import {
  MUNICIPALITY_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@mirai-gikai/shared/site";

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
              {MUNICIPALITY_NAME}の施策を
              <br />
              できる限りわかりやすく
            </h3>
            <p className="text-[15px] leading-[28px] text-black">
              {`${SITE_NAME}は、${SITE_DESCRIPTION}です。市民の意見を届けることを目指して、継続的にアップデートしていきます。`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
