import { PROGRESS_BAR_COLOR } from "@mirai-gikai/branding/brand-meta";
import { SITE_NAME } from "@mirai-gikai/branding/site";
import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_JP, Zen_Maru_Gothic } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import type { ReactNode } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// 市民向けと同一書体で統一する（D-14）
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru-gothic",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const isDev = process.env.NODE_ENV === "development";
const isStaging = process.env.VERCEL_TARGET_ENV === "staging";

export const metadata: Metadata = {
  title: `${SITE_NAME} Admin`,
  description: `${SITE_NAME}の管理者向けダッシュボード`,
  icons: {
    icon: isDev
      ? "/icons/pwa/icon_dev_192_v3.png"
      : isStaging
        ? "/icons/pwa/icon_staging_192.png"
        : "/icons/pwa/icon_android_192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${zenMaruGothic.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <NextTopLoader
          color={PROGRESS_BAR_COLOR}
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
