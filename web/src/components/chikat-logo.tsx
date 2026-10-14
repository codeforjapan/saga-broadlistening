import { SITE_NAME } from "@mirai-gikai/branding/site";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** 「CHIKAT みてみて」「CHIKAT きかせて」ロゴSVG（どちらも同じ寸法） */
const SERVICE_LOGOS = {
  mitemite: { src: "/icons/chikat-mitemite.svg", label: "みてみて" },
  kikasete: { src: "/icons/chikat-kikasete.svg", label: "きかせて" },
} as const;

const LOGO_WIDTH = 590;
const LOGO_HEIGHT = 151;

interface ChikatServiceLogoProps {
  variant: keyof typeof SERVICE_LOGOS;
  /** 高さは className で指定する（幅は縦横比から決まる） */
  className?: string;
}

/** 「みてみて」「きかせて」のロゴ。文字列の代わりに読み上げられるよう alt にロゴ名を入れる */
export function ChikatServiceLogo({
  variant,
  className,
}: ChikatServiceLogoProps) {
  const logo = SERVICE_LOGOS[variant];
  return (
    <Image
      src={logo.src}
      alt={`${SITE_NAME} ${logo.label}`}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={cn("w-auto", className)}
    />
  );
}
