import { routes } from "@/lib/routes";

export type FooterLink = {
  label: string;
  href: string;
};

export const primaryLinks: FooterLink[] = [
  {
    label: "TOP",
    href: routes.home(),
  },
];

export const policyLinks: FooterLink[] = [
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
