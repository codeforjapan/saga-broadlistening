import "./globals.css";
import { SITE_NAME } from "@mirai-gikai/shared/site";
import type { Metadata, Viewport } from "next";
import { Lexend_Giga, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const lexendGiga = Lexend_Giga({
  variable: "--font-lexend-giga",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
});

// トピックの代表意見など、引用文を明朝体で表示するために使用
const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.VERCEL_TARGET_ENV === "staging";
const siteDescription =
  "地域で今どんな政策や法案が検討されているか、わかりやすく伝える公聴プラットフォーム";
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
  keywords: [SITE_NAME, "議案", "政治", "佐賀市", "政策", "解説", "公聴"],
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
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${lexendGiga.variable} ${notoSerifJP.variable} font-sans antialiased bg-background text-foreground`}
      >
        <NextTopLoader showSpinner={false} color="#1d4ed8" />
        {children}
      </body>
    </html>
  );
}
