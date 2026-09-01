"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { getInterviewChatLink } from "@/features/interview-config/shared/utils/interview-links";
import { archiveInterviewSession } from "../../server/actions/archive-interview-session";

export function useArchiveAndNavigate(
  sessionId: string,
  target: InterviewTarget
) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const execute = async () => {
    setIsLoading(true);
    try {
      const result = await archiveInterviewSession(sessionId);
      if (result.success) {
        const chatLink = getInterviewChatLink(target);
        router.push(chatLink as Route);
      } else {
        console.error("Failed to archive session:", result.error);
        alert(result.error || "やり直しに失敗しました");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to archive session:", error);
      alert("やり直しに失敗しました");
      setIsLoading(false);
    }
  };

  return { execute, isLoading };
}
