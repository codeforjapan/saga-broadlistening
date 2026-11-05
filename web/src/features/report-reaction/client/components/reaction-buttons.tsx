"use client";

import { Lightbulb, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAnonymousSupabaseUser } from "@/features/chat/client/hooks/use-anonymous-supabase-user";
import type { ReportReactionData } from "../../shared/types";
import { useReactionToggle } from "../hooks/use-reaction-toggle";
import { ReportShareModal } from "./report-share-modal";

interface ReactionButtonsProps {
  reportId: string;
  initialData: ReportReactionData;
  billName: string;
  shareUrl: string;
  /** OGP画像のURL */
  ogImageUrl: string;
  /** シェア時のメッセージ（レポートのsummary等） */
  shareMessage?: string | null;
  /** 共有ボタンを表示するかどうか（非公開レポートでは非表示） */
  showShare?: boolean;
  /** 参考になるボタンを表示するかどうか */
  showReaction?: boolean;
}

export function ReactionButtons({
  reportId,
  initialData,
  billName,
  shareUrl,
  ogImageUrl,
  shareMessage,
  showShare = true,
  showReaction = true,
}: ReactionButtonsProps) {
  useAnonymousSupabaseUser();
  const { data, isPending, toggle } = useReactionToggle(reportId, initialData);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const isActive = data.userReaction === "helpful";

  if (!showReaction && !showShare) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-[700px] mx-auto bg-white">
          <div className="border-t border-border" />
          <div className="flex items-stretch">
            {/* 参考になる */}
            {showReaction && (
              <Button
                variant="ghost"
                onClick={() => toggle("helpful")}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 h-auto py-5 rounded-none hover:bg-transparent active:bg-muted"
              >
                <Lightbulb
                  size={20}
                  className={`transition-colors ${
                    isActive
                      ? "text-lavender-500 fill-lavender-500"
                      : "text-foreground"
                  }`}
                />
                <span
                  className={`text-[15px] font-bold transition-colors ${
                    isActive ? "text-lavender-500" : "text-foreground"
                  }`}
                >
                  参考になる
                </span>
                {data.counts.helpful > 0 && (
                  <span
                    className={`text-[15px] font-bold transition-colors ${
                      isActive ? "text-lavender-500" : "text-foreground"
                    }`}
                  >
                    {data.counts.helpful}
                  </span>
                )}
              </Button>
            )}

            {showShare && (
              <>
                {/* セパレーター */}
                {showReaction && (
                  <div className="w-px self-center h-6 bg-border shrink-0" />
                )}

                {/* 共有する */}
                <Button
                  variant="ghost"
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 h-auto py-5 rounded-none hover:bg-transparent active:bg-muted"
                >
                  <Upload size={20} className="text-foreground" />
                  <span className="text-[15px] font-bold text-foreground">
                    共有する
                  </span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <ReportShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        billName={billName}
        shareUrl={shareUrl}
        ogImageUrl={ogImageUrl}
        shareMessage={shareMessage}
      />
    </>
  );
}
