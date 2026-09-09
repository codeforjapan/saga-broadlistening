import {
  BACKGROUND_COLOR,
  THEME_COLOR,
} from "@mirai-gikai/branding/brand-meta";
import { SITE_DESCRIPTION, SITE_NAME } from "@mirai-gikai/branding/site";
import type { MetadataRoute } from "next";
import { routes } from "@/lib/routes";

const PWA_ICONS = [
  { src: "/icons/pwa/icon_android_192.png", sizes: "192x192" },
  { src: "/icons/pwa/icon_android_512.png", sizes: "512x512" },
] as const;

/**
 * PWA manifest。
 *
 * 静的な `public/manifest.json` ではなくルートで生成することで、
 * サービス名・自治体名・テーマ色を定数から引く。導入先を差し替えたときに
 * PWAのインストールカードだけ旧名が残る事故を防ぐのが目的。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: routes.home(),
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    orientation: "portrait-primary",
    // 中央80%のセーフゾーンに図形を収めてあるので maskable としても使える。
    // 静的manifestの "any maskable" 相当を、仕様どおり purpose ごとの entry で表す
    icons: PWA_ICONS.flatMap(({ src, sizes }) =>
      (["any", "maskable"] as const).map((purpose) => ({
        src,
        sizes,
        type: "image/png",
        purpose,
      }))
    ),
  };
}
