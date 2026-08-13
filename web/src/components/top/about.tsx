import Image from "next/image";
import { SITE_NAME } from "@/config/site";

export function About() {
  return (
    <div className="py-10">
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2>
            <Image
              src="/icons/about-typography.svg"
              alt="About"
              width={143}
              height={36}
              priority
            />
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            {SITE_NAME}とは
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-bold leading-[43.2px]">
              自治体の施策を
              <br />
              できる限りわかりやすく
            </h3>
            <p className="text-[15px] leading-[28px] text-black">
              {SITE_NAME}
              は、自治体で今どんな施策が検討されているか、わかりやすく伝えるプラットフォームです。市民の声を行政に届けることを目指して、継続的にアップデートしていきます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
