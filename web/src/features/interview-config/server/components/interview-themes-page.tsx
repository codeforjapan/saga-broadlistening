import "server-only";

import { Container } from "@/components/layouts/container";
import { INTERVIEW_THEME_LIST_DESCRIPTION } from "../../shared/constants";
import { getInterviewThemes } from "../loaders/get-interview-themes";
import { InterviewThemeList } from "./interview-theme-list";

/** AIインタビューのテーマ一覧ページ */
export async function InterviewThemesPage() {
  const themes = await getInterviewThemes();

  return (
    <section className="py-12 pt-24 md:pt-12">
      <Container className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-[0.14em] text-primary-accent">
            AI Interview
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">AIインタビュー</h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {INTERVIEW_THEME_LIST_DESCRIPTION}
            話した内容は、意見としてまとめてから提出するか選べます。
          </p>
        </header>

        {/* ページ見出し(h1)の直下なのでカードは h2 */}
        <InterviewThemeList themes={themes} headingLevel="h2" />
      </Container>
    </section>
  );
}
