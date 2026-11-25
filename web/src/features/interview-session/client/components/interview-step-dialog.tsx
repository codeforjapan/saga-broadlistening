"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export const INTERVIEW_SUBMIT_TOTAL_STEPS = 3;

interface InterviewStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * まとめ確認から提出までのモーダル（#274）。高さは画面の95%までにし、
 * 中身は InterviewStepFrame で上部・スクロールする本文・下に固定するボタンに分ける。
 * 共通の DialogContent はほかのモーダルも使うので、ここでクラスを上書きする
 */
export function InterviewStepDialog({
  open,
  onOpenChange,
  children,
}: InterviewStepDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-interview flex max-h-[95dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface InterviewStepFrameProps {
  step: number;
  /** STEP 2・3 で左上に出す「戻る」 */
  onBack?: () => void;
  /** 上部の見出し。なければ本文側で DialogTitle を出すこと */
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

/** 3つのステップで共通の枠。本文だけをスクロールし、ボタンは常に見えるようにする */
export function InterviewStepFrame({
  step,
  onBack,
  title,
  description,
  children,
  footer,
}: InterviewStepFrameProps) {
  return (
    <>
      <div className="relative shrink-0 px-5 pt-6 text-center md:px-8 md:pt-8">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="absolute top-4 left-2 gap-0.5 text-muted-foreground md:top-6 md:left-5"
          >
            <ChevronLeft />
            戻る
          </Button>
        )}
        <p className="text-xs font-bold tracking-wider text-muted-foreground">
          STEP {step} / {INTERVIEW_SUBMIT_TOTAL_STEPS}
        </p>
        <p className="mt-1 text-sm font-bold text-primary-accent">
          あと少しです！
        </p>
        {title && (
          <DialogTitle className="mt-1 text-xl font-bold leading-snug md:text-[22px]">
            {title}
          </DialogTitle>
        )}
        {description ? (
          <DialogDescription className="mt-1.5 text-[13px] leading-relaxed">
            {description}
          </DialogDescription>
        ) : (
          // 説明のないステップでも Radix の警告が出ないように空にしておく
          <DialogDescription className="sr-only" />
        )}
        <div className="mt-4 h-px bg-border" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-8">
        {children}
      </div>
      <div className="flex shrink-0 flex-col gap-1 border-t border-border px-5 pt-3 pb-4 md:px-8 md:pb-6">
        {footer}
      </div>
    </>
  );
}
