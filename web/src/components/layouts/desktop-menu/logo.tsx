import { SITE_NAME } from "@mirai-gikai/shared/site";
import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/routes";

/**
 * デスクトップメニュー: ロゴ (画面左上)
 */
export function DesktopMenuLogo() {
  return (
    <Link
      href={routes.home()}
      className="fixed top-6 left-6 z-50 flex items-center gap-6 hover:opacity-90 transition-opacity"
    >
      {/* ロゴ */}
      <div className="relative w-[116px] h-[98.38px]">
        <Image
          src="/img/logo.svg"
          alt={`${SITE_NAME}ロゴ`}
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* テキスト */}
      <div className="flex flex-col gap-1.5">
        <h1
          className="font-extrabold text-black"
          style={{
            fontSize: "28px",
            lineHeight: "1.1em",
            letterSpacing: "0.05em",
          }}
        >
          {SITE_NAME}
        </h1>
        <p
          className="font-bold text-black"
          style={{
            fontSize: "15px",
            lineHeight: "1.5em",
          }}
        >
          市議会の議論をわかりやすく
        </p>
      </div>
    </Link>
  );
}
