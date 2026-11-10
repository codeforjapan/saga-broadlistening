"use client";

import type { CSSProperties } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useRubyToggle } from "./use-ruby-toggle";

interface RubyInlineToggleProps {
  labelStyle?: CSSProperties;
  className?: string;
}

/**
 * 本文中に置く、ラベルとスイッチを横に並べたふりがなの切り替え。
 * 説明の詳しさの切り替え（DifficultySelector）と並べて使う。
 */
export function RubyInlineToggle({
  labelStyle,
  className,
}: RubyInlineToggleProps) {
  const { rubyEnabled, handleRubyToggle } = useRubyToggle();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm font-bold" style={labelStyle}>
        ふりがな
      </span>
      <Switch
        checked={rubyEnabled}
        onCheckedChange={handleRubyToggle}
        aria-label="ふりがな表示の切り替え"
      />
    </div>
  );
}
