"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EndInterviewButtonProps {
  /** 要約の段階なら、押すと完了して戻れないので確認を挟む */
  isSummaryStage: boolean;
  onEnd: () => void;
  disabled: boolean;
}

/**
 * 常設の「終える」ボタン。ヘッダーの「保存して中断」（あとで続きから回答する）と違い、
 * 対話中は要約へ進み、要約中はそのまとめで締める。
 * 対話中は要約のあとに1回戻れるので確認しない。
 */
export function EndInterviewButton({
  isSummaryStage,
  onEnd,
  disabled,
}: EndInterviewButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClick = () => {
    if (isSummaryStage) {
      setConfirmOpen(true);
      return;
    }
    onEnd();
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onEnd();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
      >
        {isSummaryStage ? "このまとめで終える" : "終えてまとめに進む"}
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="px-8 py-12">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold text-primary">
              このまとめで終えますか？
            </DialogTitle>
            <div className="mt-6 h-[1px] bg-border" />
          </DialogHeader>
          <p className="mt-6 text-center text-sm font-bold leading-[22px] text-foreground">
            終えると、まとめの修正やインタビューの続きはできなくなります。
          </p>
          <div className="mt-6 flex flex-col gap-4">
            <Button onClick={handleConfirm} className="w-full">
              終える
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="w-full"
            >
              キャンセル
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
