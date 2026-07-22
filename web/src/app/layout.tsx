import "./globals.css";
// フォントは Fontsource でセルフホストする（ビルド時に Google Fonts へ
// ネットワークアクセスしないため、制限された環境でもビルドが安定する）。
// font-family / CSS変数の対応は globals.css の :root で定義している。
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/700.css";
import "@fontsource/lexend-giga/400.css";
import "@fontsource/lexend-giga/500.css";
import "@fontsource/lexend-giga/700.css";
import "@fontsource/lexend-giga/800.css";
import "@fontsource/lexend-giga/900.css";
// トピックの代表意見など、引用文を明朝体で表示するために使用
import "@fontsource/noto-serif-jp/500.css";
import "@fontsource/noto-serif-jp/600.css";
// 見出し用の丸ゴシック（LINE Seed JPはGoogle Fonts未提供のため代替）
import "@fontsource/zen-maru-gothic/500.css";
import "@fontsource/zen-maru-gothic/700.css";
import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.VERCEL_TARGET_ENV === "staging";
const siteTitle = "みらい議会｜チームみらい";
const siteDescription =
  "国会で今どんな法案が検討されているか、わかりやすく伝えるプラットフォーム";
const siteName = "みらい議会";
const ogImage = {
  url: "/ogp.jpg",
  width: 1200,
  height: 630,
  alt: "みらい議会のOGPイメージ",
};

export const metadata: Metadata = {
  metadataBase: new URL(env.webUrl),
  title: siteTitle,
  description: siteDescription,
  keywords: [siteName, "議案", "政治", "日本", "政策", "解説", "チームみらい"],
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
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
    siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
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
  themeColor: "#00b98d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased bg-mirai-surface-light">
        <NextTopLoader showSpinner={false} color="#00b98d" />
        {children}
      </body>
    </html>
  );
}
