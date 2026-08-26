import Image from "next/image";
import Link from "next/link";
import { logoSizeForHeight } from "@/lib/logo";
import { routes } from "@/lib/routes";
import { SERVICE_NAME } from "@/lib/site";

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
      <Image src="/img/logo.svg" alt="" {...logoSizeForHeight(88)} priority />

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
          {SERVICE_NAME}
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
