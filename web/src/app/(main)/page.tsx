import { toHomeChatContext } from "@mirai-gikai/shared/prompts/home-chat-context";
import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { parseTopDesign } from "@/components/top/design-mock/top-design";
import { TopDesignPage } from "@/components/top/design-mock/top-design-page";
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

interface HomeProps {
  searchParams: Promise<{ design?: string | string[] }>;
}

export default async function Home({ searchParams }: HomeProps) {
  // デザイン比較モック（/?design=a 〜 /?design=d）。指定がなければ現行TOPのまま
  const design = parseTopDesign((await searchParams).design);

  const [{ billsByTag, featuredBills }, interviewThemes, currentDifficulty] =
    await Promise.all([
      loadHomeData(),
      // モックはテーマを固定データで持つので、募集中テーマは読み込まない
      design ? [] : getInterviewThemes(),
      getDifficultyLevel(),
    ]);

  const toBillChatContext = (bill: BillWithContent) => {
    return toHomeChatContext({
      policyName: bill.name,
      title: bill.bill_content?.title,
      summary: bill.bill_content?.summary,
      tags: bill.tags?.map((tag) => tag.label) || [],
      isFeatured: featuredBills.some((b) => b.id === bill.id),
    });
  };

  const chatBills = billsByTag
    .flatMap((x) => x.bills)
    .concat(featuredBills)
    .map(toBillChatContext);

  if (design) {
    return (
      <TopDesignPage
        design={design}
        currentDifficulty={currentDifficulty}
        bills={chatBills}
      />
    );
  }

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
      <HomeChatClient currentDifficulty={currentDifficulty} bills={chatBills} />
    </>
  );
}
