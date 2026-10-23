import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/layouts/footer/footer";
import { MainLayout } from "@/components/layouts/main-layout";
import { ServerAuthGate } from "@/components/layouts/server-auth-gate";
import { env } from "@/lib/env";
import { RubyfulInitializer } from "@/lib/rubyful";

export default function MainGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <SpeedInsights />
      <GoogleAnalytics gaId={env.analytics.gaTrackingId ?? ""} />
      <RubyfulInitializer />
      <ServerAuthGate />

      <MainLayout>
        <Header />
        {/* 面の重なりを出すため、本文の地はカード(白)より一段暗い薄青グレー */}
        <main className="min-h-dvh md:min-h-[calc(100dvh-96px)] bg-muted">
          {children}
        </main>
        <Footer />
      </MainLayout>
    </>
  );
}
