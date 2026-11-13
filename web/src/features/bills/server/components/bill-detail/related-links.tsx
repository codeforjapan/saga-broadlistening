import "server-only";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RelatedLinkView } from "../../../shared/utils/related-links-view";

interface RelatedLinksProps {
  links: RelatedLinkView[];
}

/**
 * 施策紹介ページの「関連リンク」（#157）。外部リンクは新しいタブで開く。
 * 佐賀市HPのリンクは URL を、施策詳細ページはドメインを2行目に出す。
 */
export function RelatedLinks({ links }: RelatedLinksProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[22px] font-bold leading-9">関連リンク</h2>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={`${link.kind}-${link.url}`}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 hover:bg-muted/50"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-bold">{link.label}</span>
                <span className="break-all text-sm text-primary-accent underline underline-offset-4">
                  {link.kind === "city_hp" ? link.url : link.domain}
                </span>
              </span>
              <Badge variant="outline" className="shrink-0 gap-1 rounded-full">
                {link.kindLabel}
                <ExternalLink className="size-3" aria-hidden="true" />
                <span className="sr-only">（新しいタブで開きます）</span>
              </Badge>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
