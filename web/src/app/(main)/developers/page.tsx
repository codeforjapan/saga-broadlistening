import { SITE_NAME } from "@mirai-gikai/shared/site";
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Database,
  Github,
  ScrollText,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: `開発者向け | ${SITE_NAME}`,
  description: `${SITE_NAME}のオープンデータAPIなど、開発者・研究者向けの情報をまとめています。`,
};

const links = [
  {
    href: routes.developersOpenDataApi(),
    icon: Database,
    title: "オープンデータAPI",
    description: "AIインタビューの回答データを取得できるAPIのリファレンス。",
    external: false,
  },
  {
    href: routes.interviewDataTerms(),
    icon: ScrollText,
    title: `${SITE_NAME}AIインタビューデータ利用規約`,
    description:
      "オープンデータとして提供されるインタビューデータの利用条件。APIで取得したデータを利用・再配布する際にご参照ください。",
    external: false,
  },
  {
    href: EXTERNAL_LINKS.GITHUB_REPO,
    icon: Github,
    title: "GitHubリポジトリ",
    description: `${SITE_NAME}のソースコード。フォークして自由にご活用いただけます。`,
    external: true,
  },
  {
    href: EXTERNAL_LINKS.FORK_GUIDELINES,
    icon: BookOpen,
    title: "自主制作ガイドライン",
    description:
      "フォーク・改変に関するガイドライン。ソースコードをご活用される際や、改変される際にご参照ください。",
    external: true,
  },
];

// Team Mirai デザインシステムの news-list パターン:
// 区切り線（border トークン）で仕切った行 + 右端にシェブロン。
// ホバーはリンク色を teal-hover へ寄せる（不透明度やスケールは使わない）
const rowClassName =
  "group flex items-center gap-4 border-b border-border py-4 transition-colors duration-150";

function LinkRowBody({
  icon: Icon,
  title,
  description,
  external,
}: {
  icon: typeof Database;
  title: string;
  description: string;
  external: boolean;
}) {
  const Chevron = external ? ArrowUpRight : ChevronRight;
  return (
    <>
      <Icon className="size-5 shrink-0 text-primary-accent" />
      <div className="flex-1 space-y-0.5">
        <p className="text-[15px] font-medium leading-relaxed tracking-wide text-black transition-colors duration-150 group-hover:text-primary-accent">
          {title}
        </p>
        <p className="text-[13px] leading-relaxed tracking-wide text-muted-foreground">
          {description}
        </p>
      </div>
      <Chevron className="size-5 shrink-0 text-primary-accent" />
    </>
  );
}

export default function DevelopersPage() {
  return (
    <div className="min-h-dvh bg-white">
      <section className="py-12 pt-24 md:pt-12">
        <Container className="space-y-10">
          {/* Team Mirai デザインシステムの節見出し: 英字ラベル + 日本語見出し */}
          <header className="space-y-2">
            <p className="text-sm font-semibold tracking-[0.14em] text-primary-accent">
              Developers
            </p>
            <h1 className="text-2xl font-bold tracking-wider text-black sm:text-3xl">
              開発者向け
            </h1>
          </header>

          <p className="text-[15px] leading-loose tracking-wide text-muted-foreground">
            {SITE_NAME}
            では、AIインタビューに寄せられた施策への意見を、誰でも分析・活用できるオープンデータとして公開しています。
          </p>

          <div className="flex flex-col border-t border-border">
            {links.map(({ href, external, ...item }) =>
              external ? (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={rowClassName}
                >
                  <LinkRowBody external {...item} />
                </a>
              ) : (
                <Link key={href} href={href} className={rowClassName}>
                  <LinkRowBody external={false} {...item} />
                </Link>
              )
            )}
          </div>
        </Container>
      </section>
    </div>
  );
}
