import { SITE_NAME, SITE_TAGLINE } from "@mirai-gikai/shared/site";
import { cn } from "@/lib/utils";

/** ヘッダー(sm) / フッター(md) / デスクトップメニュー(lg) の3段階 */
type SiteLogoSize = "sm" | "md" | "lg";

/**
 * ワードマークとタグラインの寸法は必ずセットで持つ。
 * 別々のマップにすると片方だけ更新されて字面のバランスが崩れる。
 */
const SIZES: Record<SiteLogoSize, { wordmark: string; tagline: string }> = {
  sm: { wordmark: "text-xl", tagline: "text-[10px]" },
  md: { wordmark: "text-[28px]", tagline: "text-xs" },
  lg: { wordmark: "text-[32px]", tagline: "text-[15px]" },
};

interface SiteLogoProps {
  size: SiteLogoSize;
  /** タグラインを併記するか。小さく見せる箇所では潰れるので false */
  withTagline?: boolean;
  className?: string;
}

/**
 * サービスロゴ。
 *
 * このブランチ（vanilla）は特定自治体のロゴ画像を持たないため、ロゴは
 * サービス名（{@link SITE_NAME}）をCSSで組んだワードマークで代替している。
 * 導入先のロゴ画像が用意できたら、このコンポーネントの中身を差し替える。
 *
 * ただしOGP画像のワードマークは Satori で描くため別実装になっている。
 * ロゴを変えるときは `web/src/app/api/og/report/route.tsx` も合わせて直すこと。
 */
export function SiteLogo({
  size,
  withTagline = false,
  className,
}: SiteLogoProps) {
  const { wordmark, tagline } = SIZES[size];
  return (
    <span className={cn("flex flex-col gap-1.5", className)}>
      <span
        className={cn(
          "font-extrabold leading-none tracking-[0.05em] text-primary-accent",
          wordmark
        )}
      >
        {SITE_NAME}
      </span>
      {withTagline && (
        <span className={cn("font-bold leading-snug text-foreground", tagline)}>
          {SITE_TAGLINE}
        </span>
      )}
    </span>
  );
}
