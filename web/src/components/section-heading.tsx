import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  description?: string;
  /** 見出しの左に置くアイコン */
  icon?: ReactNode;
  /** 入れ子のセクションでは "h3" を指定して見出し階層を保つ */
  as?: "h2" | "h3";
  /** 「すべて見る」の遷移先。省略すると導線を出さない */
  moreHref?: Route;
}

/** 一覧セクションの見出し。必要ならアイコンと「すべて見る」導線を添える */
export function SectionHeading({
  title,
  description,
  icon,
  as: Heading = "h2",
  moreHref,
}: SectionHeadingProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-2">
        {icon && (
          <span className="mt-0.5 text-primary-accent" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="flex flex-col gap-1.5">
          <Heading className="text-[22px] font-bold leading-[1.48]">
            {title}
          </Heading>
          {description && (
            <p className="text-xs font-medium leading-[1.67]">{description}</p>
          )}
        </div>
      </div>

      {moreHref && (
        <Link
          href={moreHref}
          className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-foreground shadow-card"
        >
          すべて見る
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
