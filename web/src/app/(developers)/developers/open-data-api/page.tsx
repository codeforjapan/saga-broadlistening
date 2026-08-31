import { SITE_NAME } from "@mirai-gikai/shared/site";
import type { Metadata } from "next";
import { OpenDataApiReference } from "@/features/open-data/client/components/open-data-api-reference";

export const metadata: Metadata = {
  title: `オープンデータAPI | ${SITE_NAME}`,
  description: `${SITE_NAME}のAIインタビューデータをオープンデータとして取得できるAPIのリファレンスです。`,
};

export default function OpenDataApiPage() {
  return <OpenDataApiReference />;
}
