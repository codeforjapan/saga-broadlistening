import { Breadcrumb } from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";
import type { InterviewTarget } from "../types/interview-target";
import {
  getInterviewExitLink,
  getInterviewLPLink,
} from "../utils/interview-links";

interface DisclosureBreadcrumbProps {
  target: InterviewTarget;
}

export function DisclosureBreadcrumb({ target }: DisclosureBreadcrumbProps) {
  // 1つ上の階層は、施策経由なら施策詳細、テーマ単独ならテーマ一覧になる
  const parent =
    target.kind === "policy"
      ? { label: "施策詳細", href: getInterviewExitLink(target) }
      : { label: "AIインタビュー一覧", href: routes.interviews() };

  const items = [
    { label: "TOP", href: routes.home() },
    parent,
    { label: "AIインタビュー", href: getInterviewLPLink(target) },
    { label: "情報開示" },
  ];

  return <Breadcrumb items={items} />;
}
