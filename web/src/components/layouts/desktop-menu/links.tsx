import { COPYRIGHT_TEXT } from "@mirai-gikai/shared/site";
import type { Route } from "next";
import Link from "next/link";
import { routes } from "@/lib/routes";

type FooterLinkItem = {
  label: string;
  href: string;
};

const links: FooterLinkItem[] = [
  {
    label: "利用規約",
    href: routes.terms(),
  },
  {
    label: "プライバシーポリシー",
    href: routes.privacy(),
  },
  {
    label: "開発者向け",
    href: routes.developers(),
  },
];

/**
 * デスクトップメニュー: フッターリンク（サイドバー内）
 */
export function DesktopMenuLinks() {
  return (
    <div className="flex flex-col gap-1.5">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href as Route}
          className="font-medium text-xs transition-opacity hover:opacity-70"
          style={{
            lineHeight: "1.48em",
          }}
        >
          {link.label}
        </Link>
      ))}
      <p
        className="font-medium text-xs"
        style={{
          lineHeight: "1.48em",
        }}
      >
        {COPYRIGHT_TEXT}
      </p>
    </div>
  );
}
