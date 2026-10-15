"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  extractInterviewTargetFromPath,
  getInterviewLPLink,
} from "@/features/interview-config/shared/utils/interview-links";
import { routes } from "@/lib/routes";

export function InterviewHeaderActions() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleSaveAndExit = () => {
    const isPreview = pathname.startsWith("/preview");
    const previewToken = isPreview
      ? searchParams.get("token") || undefined
      : undefined;
    const target = extractInterviewTargetFromPath(pathname, previewToken);

    if (target) {
      router.push(getInterviewLPLink(target) as Route);
    } else {
      router.push(routes.home());
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      // 開始画面（data-interview-chat-start）を出しているあいだは隠す。
      // 「はじめる」でチャットに切り替わると、再読み込みなしで出る
      className="[body:has([data-interview-chat-start])_&]:hidden"
      onClick={handleSaveAndExit}
    >
      保存して中断
    </Button>
  );
}
