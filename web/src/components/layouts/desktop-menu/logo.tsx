import { SITE_NAME } from "@mirai-gikai/branding/site";
import { logoImageProps } from "@/lib/logo";
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
      {/* ロゴ。隣の<h1>が同じサービス名を読ませるので、画像は装飾扱いにする */}
      <Image alt="" {...logoImageProps("full", 88)} priority />

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
          佐賀市の施策をわかりやすく
        </p>
      </div>
    </Link>
  );
}
