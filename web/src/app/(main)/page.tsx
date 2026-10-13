import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { TopPage } from "@/features/top/server/components/top-page";
import { getTopThemes } from "@/features/top/server/loaders/get-top-themes";

export default async function Home() {
  const difficulty = await getDifficultyLevel();
  const themes = await getTopThemes(difficulty);

  return <TopPage themes={themes} />;
}
