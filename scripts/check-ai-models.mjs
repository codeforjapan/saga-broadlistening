/**
 * packages/shared/src/ai/models.ts に並ぶモデルIDが、AI Gateway に実在するか確認する。
 *
 * preview 版は GA 化やリタイアでIDごと消えることがあり、消えたIDを指したまま実行すると
 * 実行時に「Model '...' not found」で落ちる。UIの選択肢や既定値に紛れていると
 * 気づくのが遅れるため、まとめて突き合わせられるようにしておく。
 *
 * 使い方: pnpm check:ai-models
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const MODELS_ENDPOINT = "https://ai-gateway.vercel.sh/v1/models";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modelsFile = path.join(repoRoot, "packages/shared/src/ai/models.ts");

/** models.ts の `key: "provider/model",` 行からモデルIDを拾う */
function readDeclaredModels() {
  const source = readFileSync(modelsFile, "utf8");
  return [...source.matchAll(/^\s*(\w+):\s*"([^"]+\/[^"]+)",/gm)].map(
    ([, key, id]) => ({ key, id })
  );
}

async function fetchAvailableModelIds() {
  const response = await fetch(MODELS_ENDPOINT);
  if (!response.ok) {
    throw new Error(
      `AI Gateway のモデル一覧を取得できませんでした (HTTP ${response.status})`
    );
  }
  const body = await response.json();
  return new Set((body.data ?? []).map((model) => model.id));
}

const declared = readDeclaredModels();
const available = await fetchAvailableModelIds();
const missing = declared.filter(({ id }) => !available.has(id));

if (missing.length === 0) {
  console.log(`✓ ${declared.length} 件すべて AI Gateway に存在します`);
  process.exit(0);
}

console.error("✗ AI Gateway に存在しないモデルIDがあります:\n");
for (const { key, id } of missing) {
  // preview が外れて GA 化しただけのことが多いので、候補があれば併記する
  const gaCandidate = id.replace(/-preview$/, "");
  const hint =
    gaCandidate !== id && available.has(gaCandidate)
      ? `  → ${gaCandidate} が利用可能です`
      : "";
  console.error(`  ${key}: ${id}${hint}`);
}
console.error(
  "\npackages/shared/src/ai/models.ts と、参照している既定値・選択肢・料金表を更新してください。"
);
process.exit(1);
