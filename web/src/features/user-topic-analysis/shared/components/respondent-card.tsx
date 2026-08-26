import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";
import type { PublicRespondent } from "../types";
import { formatOpinionDate } from "../utils/format-opinion-date";
import {
  DEFAULT_ATTRIBUTION_LABEL,
  normalizeRoleTitle,
} from "../utils/topic-category";
import { PersonAvatar } from "./person-avatar";

interface RespondentCardProps {
  respondent: PublicRespondent;
  /** 相対日時の基準時刻。サーバーで固定しハイドレーションずれを防ぐ。 */
  now: Date;
}

/**
 * 回答一覧の回答者カード（回答者1人=1カード）。
 * アバター・立場・回答日・要約テキストを表示し、
 * カード全体が意見詳細（会話ログ）へのリンクになる。
 *
 * Epic #54 で賛否・回答者カテゴリが廃止されたため、バッジ類は表示しない。
 */
export function RespondentCard({ respondent, now }: RespondentCardProps) {
  const dateLabel = formatOpinionDate(respondent.created_at, now);
  const heading =
    normalizeRoleTitle(respondent.role_title) ?? DEFAULT_ATTRIBUTION_LABEL;

  return (
    <Link
      href={routes.publicReport(respondent.id) as Route}
      prefetch={false}
      className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm transition-colors hover:bg-muted"
    >
      {/* アバター */}
      <PersonAvatar />

      {/* アバター横: 立場・日付・要約を同じインデントで縦並び */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-[15px] font-bold leading-6 text-foreground">
            {heading}
          </h3>
          {dateLabel && (
            <span className="text-[13px] text-muted-foreground">
              {dateLabel}
            </span>
          )}
        </div>

        {/* 要約テキスト */}
        {respondent.summary && (
          <p className="line-clamp-2 text-[12px] leading-[22px] text-foreground">
            {respondent.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
