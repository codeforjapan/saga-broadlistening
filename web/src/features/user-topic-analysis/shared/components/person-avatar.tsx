import { cn } from "@/lib/utils";

interface PersonAvatarProps {
  className?: string;
}

/**
 * 回答者アバター（Figma の人物シルエット）。
 * lucide に同等のアイコンが無いため、デザインの「頭＋肩の2円を円でクリップ」した
 * シルエットをカスタムコンポーネントとして実装する（lucide 必須ルールの合意済み例外）。
 *
 * Epic #54 で賛否（期待/懸念）が廃止されたため、配色は単一。
 */
export function PersonAvatar({ className }: PersonAvatarProps) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background",
        className
      )}
    >
      <svg
        viewBox="0 0 46 46"
        className="size-full text-muted-foreground"
        fill="currentColor"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 頭 */}
        <circle cx="23" cy="15.79" r="8.12" opacity="0.6" />
        {/* 肩（下部は円マスク＝overflow-hidden で切れる） */}
        <circle cx="23" cy="37.94" r="14.03" opacity="0.4" />
      </svg>
    </span>
  );
}
