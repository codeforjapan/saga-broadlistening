import { SITE_NAME } from "@mirai-gikai/branding/site";
import type { Metadata } from "next";
import { InterviewThemesPage } from "@/features/interview-config/server/components/interview-themes-page";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: `AIインタビュー一覧 | ${SITE_NAME}`,
  description:
    "AIとの対話で意見や経験を聞かせていただける、募集中のテーマ一覧です。",
  alternates: {
    canonical: routes.interviews(),
  },
};

export default function InterviewsPage() {
  return <InterviewThemesPage />;
}
