import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";
import {
  getReportOpinionsLink,
  getReportOriginLink,
  type ReportOrigin,
} from "../utils/public-report-display";

interface ReportBreadcrumbProps {
  /** 意見が寄せられた対象（施策・テーマ） */
  origin: ReportOrigin;
  reportHref?: string;
  additionalItems?: BreadcrumbItem[];
}

/**
 * 施策に紐づく意見は「施策詳細 > レポート一覧」を上位階層に置く。
 * 施策を持たない抽象テーマ型は「AIインタビュー > テーマ名 > レポート一覧」に置き換える。
 */
function buildParentItems(origin: ReportOrigin): BreadcrumbItem[] {
  if (!origin.policyId) {
    return [
      { label: "AIインタビュー", href: routes.interviews() },
      { label: origin.theme.name, href: getReportOriginLink(origin) },
      { label: "レポート一覧", href: getReportOpinionsLink(origin) },
    ];
  }

  return [
    { label: "施策詳細", href: getReportOriginLink(origin) },
    { label: "レポート一覧", href: getReportOpinionsLink(origin) },
  ];
}

export function ReportBreadcrumb({
  origin,
  reportHref,
  additionalItems = [],
}: ReportBreadcrumbProps) {
  const baseItems: BreadcrumbItem[] = [
    { label: "TOP", href: routes.home() },
    ...buildParentItems(origin),
    {
      label: "レポート",
      href: reportHref,
    },
  ];

  return <Breadcrumb items={[...baseItems, ...additionalItems]} />;
}
