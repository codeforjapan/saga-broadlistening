import type { LucideIcon } from "lucide-react";

/**
 * 見出しの頭に置く線アイコン（#271。絵文字の代わり）。
 * 見出しの文字の大きさに合わせ、色はテーマの decor にする。
 */
export function HeadingIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <Icon
      aria-hidden="true"
      className="mr-[0.35em] inline-block size-[1.05em] align-[-0.15em] text-decor"
    />
  );
}
