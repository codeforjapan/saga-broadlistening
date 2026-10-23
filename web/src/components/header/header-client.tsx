"use client";

import { SITE_NAME } from "@mirai-gikai/branding/site";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewHeaderActions } from "@/features/interview-session/client/components/interview-header-actions";
import { sendDifficultyStateEvent } from "@/lib/analytics/preference-state-events";
import { useOnPageView } from "@/lib/analytics/use-on-page-view";
import { logoImageProps } from "@/lib/logo";
import { getPageLayout, isInterviewPage } from "@/lib/page-layout-utils";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { HamburgerMenu } from "./hamburger-menu";

interface HeaderClientProps {
  difficultyLevel: DifficultyLevelEnum;
}

export function HeaderClient({ difficultyLevel }: HeaderClientProps) {
  const pathname = usePathname();
  const { showDifficultySelector, difficultyInMobileMenu } =
    getPageLayout(pathname);
  const showInterviewActions = isInterviewPage(pathname);

  // Headerは1ページに1つだけ常時マウントされるため、
  // ここで難易度設定をページ表示のたびにGAへ送る
  // (DifficultySelectorはmarkdown埋め込み等で複数箇所に
  //  同時マウントされ得るため、送信元には適さない)
  useOnPageView(() => sendDifficultyStateEvent(difficultyLevel));

  return (
    <header className="px-3 fixed top-4 left-0 right-0 z-40 max-w-[1440px] mx-auto">
      <div className="rounded-2xl bg-secondary shadow-sm mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ。小さく出すためタグライン抜き。ワードマークを含むのでサービス名は併記しない */}
          <Link href={routes.home()} aria-label={`${SITE_NAME} ホーム`}>
            <Image
              alt={SITE_NAME}
              {...logoImageProps("compact", 32)}
              // PC では幅 95px（高さは縦横比から約 37px）。スマホは高さ 32px のまま
              className="h-8 w-auto md:h-auto md:w-[95px]"
            />
          </Link>

          {/* Navigation */}
          <nav
            className="flex items-center space-x-2"
            aria-label="補助ナビゲーション"
          >
            {showDifficultySelector && (
              <DifficultySelector
                currentLevel={difficultyLevel}
                className={cn(difficultyInMobileMenu && "max-md:hidden")}
              />
            )}
            {showInterviewActions && <InterviewHeaderActions />}
            <HamburgerMenu
              mobileDifficultyLevel={
                difficultyInMobileMenu ? difficultyLevel : undefined
              }
            />
          </nav>
        </div>
      </div>
    </header>
  );
}
