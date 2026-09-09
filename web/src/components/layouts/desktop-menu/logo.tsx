import { SITE_NAME } from "@mirai-gikai/branding/site";
import Link from "next/link";
import { SiteLogo } from "@/components/brand/site-logo";
import { routes } from "@/lib/routes";

/**
 * デスクトップメニュー: ロゴ (画面左上)
 */
export function DesktopMenuLogo() {
  return (
    <Link
      href={routes.home()}
      aria-label={`${SITE_NAME} ホーム`}
      className="fixed top-6 left-6 z-50 flex items-center gap-6 hover:opacity-90 transition-opacity"
    >
      <SiteLogo size="lg" withTagline />
    </Link>
  );
}
