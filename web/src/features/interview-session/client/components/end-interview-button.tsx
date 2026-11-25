"use client";

import { Button } from "@/components/ui/button";

interface EndInterviewButtonProps {
  onEnd: () => void;
  disabled: boolean;
}

/**
 * 対話中に出す「終えてまとめに進む」ボタン。ヘッダーの「保存して中断」（あとで続きから回答する）と違い、
 * 要約へ進む。要約のあとに1回対話へ戻れるので確認しない。
 */
export function EndInterviewButton({
  onEnd,
  disabled,
}: EndInterviewButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onEnd}
      disabled={disabled}
    >
      終えてまとめに進む
    </Button>
  );
}
