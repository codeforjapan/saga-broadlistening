"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { RubyToggle } from "@/lib/rubyful";
import { cn } from "@/lib/utils";

interface HamburgerMenuProps {
  /** スマホ幅でヘッダーから難易度切り替えを移すページ（TOP）でだけ渡す */
  mobileDifficultyLevel?: DifficultyLevelEnum;
}

export function HamburgerMenu({ mobileDifficultyLevel }: HamburgerMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          aria-label="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-50", mobileDifficultyLevel && "max-md:w-fit")}
        align="end"
      >
        {mobileDifficultyLevel && (
          <div className="mb-3 md:hidden">
            <DifficultySelector
              currentLevel={mobileDifficultyLevel}
              label="説明をもっと詳しく"
            />
          </div>
        )}
        <RubyToggle />
      </PopoverContent>
    </Popover>
  );
}
