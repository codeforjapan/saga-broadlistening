"use client";

import { Button } from "@/components/ui/button";

interface TimeUpPromptProps {
  onEndInterview: () => void;
  onContinue: () => void;
  disabled?: boolean;
}

/**
 * 目安時間超過時にユーザーに終了/継続を尋ねるコンポーネント
 */
export function TimeUpPrompt({
  onEndInterview,
  onContinue,
  disabled,
}: TimeUpPromptProps) {
  return (
    <div className="mx-4 rounded-lg bg-muted p-4 shadow-card">
      <p className="mb-3 text-sm font-medium text-gray-700">
        目安時間を超過しましたが、インタビューを続けてもよいですか？
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onContinue} disabled={disabled}>
          インタビューを続ける
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onEndInterview}
          disabled={disabled}
        >
          終了してレポートを作成
        </Button>
      </div>
    </div>
  );
}
