import "./globals.css";
import { OGP_IMAGE } from "@mirai-gikai/branding/assets";
import {
  PROGRESS_BAR_COLOR,
  THEME_COLOR,
} from "@mirai-gikai/branding/brand-meta";
import { BRAND_CONFIG } from "@mirai-gikai/branding/config";
import { SITE_NAME } from "@mirai-gikai/branding/site";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Zen_Maru_Gothic } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import { ExternalUidCapture } from "@/features/external-identity/client/components/external-uid-capture";
import { EARLY_CAPTURE_SCRIPT } from "@/features/external-identity/shared/utils/early-capture-script";
import { env } from "@/lib/env";

// 本文。D-7 により基準ウェイトは 500（強調 700）。
// 可変フォントとして 1 本で読み込む（太さごとに同じファイルの定義を並べないため）。
// そのため 600 なども本当の太さで表示されるので、本文では 400・500・700 だけを使う
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
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

// トピックの代表意見など、引用文を明朝体で表示するために使用（500・600 を使う。可変フォントとして 1 本で読み込む）
const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  display: "swap",
  fallback: ["serif"],
});

const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.VERCEL_TARGET_ENV === "staging";
const siteDescription = BRAND_CONFIG.siteDescription;
const ogImage = {
  url: OGP_IMAGE.src,
  width: OGP_IMAGE.width,
  height: OGP_IMAGE.height,
  alt: `${SITE_NAME}のOGPイメージ`,
};

export const metadata: Metadata = {
  metadataBase: new URL(env.webUrl),
  title: SITE_NAME,
  description: siteDescription,
  keywords: [SITE_NAME, ...BRAND_CONFIG.keywords],
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
  themeColor: THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    // フォントの変数は tokens.css の @theme（:root）から参照するので、html に定義する
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${zenMaruGothic.variable} ${notoSerifJP.variable}`}
    >
      <head>
        {/*
          外部アプリが #uid= 付きで開いたとき、GA 等が URL を記録する前に
          フラグメントを退避・除去する（検証と送信は ExternalUidCapture が行う）
        */}
        <script dangerouslySetInnerHTML={{ __html: EARLY_CAPTURE_SCRIPT }} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <NextTopLoader showSpinner={false} color={PROGRESS_BAR_COLOR} />
        <ExternalUidCapture />
        {children}
      </body>
    </html>
  );
}
