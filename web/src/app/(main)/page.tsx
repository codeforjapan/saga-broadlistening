import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { Hero } from "@/components/top/hero";
import { TOP_SECTIONS } from "@/components/top/top-sections";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { PolicyShowcaseSection } from "@/features/bills/server/components/policy-showcase-section";
import { loadHomeData } from "@/features/bills/server/loaders/load-home-data";
import type { BillWithContent } from "@/features/bills/shared/types";
import { HomeChatClient } from "@/features/chat/client/components/home-chat-client";
import { InterviewThemeSection } from "@/features/interview-config/server/components/interview-theme-section";
import { getInterviewThemes } from "@/features/interview-config/server/loaders/get-interview-themes";

/** トップページに出すAIインタビューのテーマ件数。残りは一覧ページで見せる */
const TOP_INTERVIEW_THEME_LIMIT = 3;

export default async function Home() {
  const [{ billsByTag, featuredBills }, interviewThemes, currentDifficulty] =
    await Promise.all([
      loadHomeData(),
      getInterviewThemes(),
      getDifficultyLevel(),
    ]);

  const toBillChatContext = (bill: BillWithContent) => {
    return {
      name: `${bill.bill_content?.title}（${bill.name}）`,
      summary: bill.bill_content?.summary ?? undefined,
      tags: bill.tags?.map((tag) => tag.label) || [],
      isFeatured: featuredBills.some((b) => b.id === bill.id),
    };
  };

  return (
    <>
      <Hero />

      <Container>
        <div className="py-10">
          <main className="flex flex-col gap-16">
            {/* AIインタビューセクション */}
            <InterviewThemeSection
              sectionId={TOP_SECTIONS.interview}
              themes={interviewThemes.slice(0, TOP_INTERVIEW_THEME_LIMIT)}
            />

            {/* 施策紹介セクション（注目の施策 + タグ別一覧） */}
            <PolicyShowcaseSection
              sectionId={TOP_SECTIONS.policy}
              featuredBills={featuredBills}
              billsByTag={billsByTag}
            />
          </main>
        </div>
      </Container>

      <Container>
        {/* 本システムについて セクション */}
        <About />

        {/* 免責事項 */}
        <BillDisclaimer />
      </Container>

      {/* チャット機能 */}
      <HomeChatClient
        currentDifficulty={currentDifficulty}
        bills={billsByTag
          .flatMap((x) => x.bills)
          .concat(featuredBills)
          .map(toBillChatContext)}
      />
    </>
  );
}
