import type { NextConfig } from "next";
import { routes } from "./src/lib/routes";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  experimental: {
    serverSourceMaps: true,
  },
  typedRoutes: true,
  async redirects() {
    return [
      {
        source: "/public-chat-settings",
        destination: routes.publicChatSettings(),
        permanent: true,
      },
      {
        source: "/public-chat-prompts",
        destination: routes.publicChatPrompts(),
        permanent: true,
      },
      // 意見募集の作成・編集は /interviews 配下の画面に一本化した。
      // 施策ページ配下の旧URL（ブックマーク等）はそちらへ送る
      {
        source: "/bills/:id/interview/new",
        destination: routes.interviewNewForPolicy(":id"),
        permanent: true,
      },
      {
        source: "/bills/:id/interview/:configId/edit",
        destination: routes.interviewEdit(":configId"),
        permanent: true,
      },
    ];
  },
  turbopack: {
    root: "../",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/policy-thumbnails/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/policy-thumbnails/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/policy-thumbnails/**",
      },
      ...(isDev
        ? [
            {
              protocol: "https" as const,
              hostname: "placehold.co",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
