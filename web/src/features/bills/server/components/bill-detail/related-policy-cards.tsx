import "server-only";

import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { resolveInterviewThumbnail } from "@/features/interview-config/shared/utils/interview-theme";
import { routes } from "@/lib/routes";
import type { ChildPolicyCardView } from "../../../shared/utils/child-policy-card";

interface RelatedPolicyCardsProps {
  policies: ChildPolicyCardView[];
}

/** 親施策ページの「関連施策」（子施策＝施策紹介ページへのカード、#156） */
export function RelatedPolicyCards({ policies }: RelatedPolicyCardsProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[22px] font-bold leading-9">関連施策</h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {policies.map((policy) => (
          <li key={policy.id}>
            <Link
              href={routes.billDetail(policy.id) as Route}
              className="flex h-full flex-col overflow-hidden rounded-2xl bg-white hover:bg-muted/50"
            >
              {/* 装飾の画像なので alt は空にし、施策名は見出しで読ませる */}
              <div className="relative aspect-[3/2] w-full">
                <Image
                  src={resolveInterviewThumbnail(policy.thumbnailUrl, null)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 640px) 260px, 100vw"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="text-xs text-muted-foreground">
                  施策紹介
                  {policy.tagLabel && ` · ${policy.tagLabel}`}
                </p>
                <h3 className="font-bold">{policy.name}</h3>
                <span className="mt-auto flex items-center gap-0.5 pt-1 text-xs font-bold text-primary-accent">
                  詳しく見る
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
