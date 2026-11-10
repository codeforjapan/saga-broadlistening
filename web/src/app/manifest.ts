import {
  BACKGROUND_COLOR,
  THEME_COLOR,
} from "@mirai-gikai/branding/brand-meta";
import { BRAND_CONFIG } from "@mirai-gikai/branding/config";
import type { MetadataRoute } from "next";

/**
 * PWA の manifest（/manifest.webmanifest）。
 * 名前・説明文・色はブランド設定とパレットから作り、自治体ごとの値を1か所にまとめる。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_CONFIG.siteName,
    short_name: BRAND_CONFIG.siteName,
    description: BRAND_CONFIG.siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    orientation: "portrait-primary",
    // 旧 manifest.json の purpose: "any maskable" と同じ。型が1つずつしか取らないので分けて並べる
    icons: (["any", "maskable"] as const).flatMap((purpose) =>
      [192, 512].map((size) => ({
        src: `/icons/pwa/icon_android_${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose,
      }))
    ),
  };
}
