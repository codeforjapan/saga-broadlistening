import { cn } from "@/lib/utils";
import { ThemeCard } from "./theme-card";
import { TOP_THEMES, usesThemeGrid } from "./top-themes";

/** テーマカードの一覧。末尾に「準備中」の枠を置く */
export function ThemeCardList() {
  const isGrid = usesThemeGrid(TOP_THEMES.length);

  return (
    <div className={cn("grid gap-6", isGrid && "md:grid-cols-2")}>
      {TOP_THEMES.map((theme, index) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          stacked={isGrid}
          priority={index === 0}
        />
      ))}

      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sky-200 px-4 py-6 md:flex-row md:gap-3",
          isGrid && "md:col-span-2"
        )}
      >
        <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-foreground">
          準備中
        </span>
        <p className="text-sm text-muted-foreground">
          ほかのテーマは今後追加予定です
        </p>
      </div>
    </div>
  );
}
