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
    <Button variant="outline" size="sm" onClick={handleSaveAndExit}>
      保存して中断
    </Button>
  );
}
