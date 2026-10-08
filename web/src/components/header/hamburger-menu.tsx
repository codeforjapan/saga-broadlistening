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

interface HamburgerMenuProps {
  /** 難易度切り替えを出せるページでのみ渡す */
  difficultyLevel?: DifficultyLevelEnum;
}

export function HamburgerMenu({ difficultyLevel }: HamburgerMenuProps) {
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
        // 難易度切り替えを足すぶん、モックのスマホ幅でだけ幅を広げる
        className="w-50 max-md:[body:has([data-top-design])_&]:w-fit"
        align="end"
      >
        {difficultyLevel && (
          // TOPデザイン比較モック（data-top-design）のスマホ幅でだけ、
          // ヘッダーの難易度切り替えをメニュー内に出す
          <div className="mb-3 hidden max-md:[body:has([data-top-design])_&]:block">
            <DifficultySelector
              currentLevel={difficultyLevel}
              label="説明をもっと詳しく"
            />
          </div>
        )}
        <RubyToggle />
      </PopoverContent>
    </Popover>
  );
}
