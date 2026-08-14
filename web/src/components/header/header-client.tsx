"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/config/site";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewHeaderActions } from "@/features/interview-session/client/components/interview-header-actions";
import { isInterviewPage, isMainPage } from "@/lib/page-layout-utils";
import { routes } from "@/lib/routes";
import { HamburgerMenu } from "./hamburger-menu";

interface HeaderClientProps {
  difficultyLevel: DifficultyLevelEnum;
}

export function HeaderClient({ difficultyLevel }: HeaderClientProps) {
  const pathname = usePathname();
  const showDifficultySelector = isMainPage(pathname);
  const showInterviewActions = isInterviewPage(pathname);

  return (
    <header className="px-3 fixed top-4 left-0 right-0 z-40 max-w-[1440px] mx-auto">
      <div className="rounded-2xl bg-mirai-gradient shadow-sm mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Site Title */}
          <Link
            href={routes.home()}
            className="flex items-center transition-opacity hover:opacity-90"
            aria-label="ホーム"
          >
            <span className="font-heading text-lg font-bold tracking-wide text-mirai-text">
              {SITE_NAME}
            </span>
          </Link>

          {/* Navigation */}
          <nav
            className="flex items-center space-x-2"
            aria-label="補助ナビゲーション"
          >
            {showDifficultySelector && (
              <DifficultySelector currentLevel={difficultyLevel} />
            )}
            {showInterviewActions && <InterviewHeaderActions />}
            <HamburgerMenu />
          </nav>
        </div>
      </div>
    </header>
  );
}
