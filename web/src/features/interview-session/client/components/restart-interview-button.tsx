"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { useArchiveAndNavigate } from "../hooks/use-archive-and-navigate";
import { RestartConfirmDialog } from "./restart-confirm-dialog";

interface RestartInterviewButtonProps {
  sessionId: string;
  target: InterviewTarget;
}

export function RestartInterviewButton({
  sessionId,
  target,
}: RestartInterviewButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { execute, isLoading } = useArchiveAndNavigate(sessionId, target);

  const handleConfirm = async () => {
    try {
      await execute();
    } finally {
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
      >
        <RotateCcw className="size-4" />
        <span>もう一度最初から回答する</span>
      </Button>
      <RestartConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </>
  );
}
