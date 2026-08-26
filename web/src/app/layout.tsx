import "./globals.css";
import {
  PROGRESS_BAR_COLOR,
  THEME_COLOR,
} from "@mirai-gikai/design-tokens/brand-meta";
import { SITE_NAME } from "@mirai-gikai/shared/site";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Zen_Maru_Gothic } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

// 本文。D-7 により基準ウェイトは 500（強調 700）
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

// 見出し（D-15）。見出し要素のみに適用するため 700 のみ読み込む
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru-gothic",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

// トピックの代表意見など、引用文を明朝体で表示するために使用
const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  fallback: ["serif"],
});

const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.VERCEL_TARGET_ENV === "staging";
const siteDescription =
  "佐賀市で今どんな施策が検討されているか、わかりやすく伝える公聴プラットフォーム";
const ogImage = {
  url: "/ogp.jpg",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME}のOGPイメージ`,
};

export const metadata: Metadata = {
  metadataBase: new URL(env.webUrl),
  title: SITE_NAME,
  description: siteDescription,
  keywords: [SITE_NAME, "施策", "政治", "佐賀市", "政策", "解説", "公聴"],
  icons: {
    icon: isDev
      ? "/icons/pwa/icon_dev_192_v3.png"
      : isStaging
        ? "/icons/pwa/icon_staging_192.png"
        : "/icons/pwa/icon_android_192.png",
    apple: isStaging
      ? "/icons/pwa/icon_staging_ios.png"
      : "/icons/pwa/icon_ios.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: SITE_NAME,
    description: siteDescription,
    images: [ogImage],
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: siteDescription,
    images: [ogImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${zenMaruGothic.variable} ${notoSerifJP.variable} font-sans antialiased bg-background text-foreground`}
      >
        <NextTopLoader showSpinner={false} color={PROGRESS_BAR_COLOR} />
        {children}
      </body>
    </html>
  );
}
