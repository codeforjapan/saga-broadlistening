import "server-only";
import {
  PUBLIC_PROMPT_CATALOG,
  type PublicPromptKey,
} from "@mirai-gikai/shared/prompts/catalog";
import { findPromptState } from "@mirai-gikai/shared/prompts/repository";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { listPublishedPreviewBillOptions } from "../repositories/preview-repository";

export async function loadPromptEditor() {
  await requireAdmin();
  const keys = Object.keys(PUBLIC_PROMPT_CATALOG) as PublicPromptKey[];
  const [states, bills] = await Promise.all([
    Promise.all(
      keys.map(async (key) => ({ key, state: await findPromptState(key) }))
    ),
    listPublishedPreviewBillOptions(),
  ]);
  return {
    prompts: states.map(({ key, state }) => ({
      key,
      name: PUBLIC_PROMPT_CATALOG[key].name,
      defaultContent: PUBLIC_PROMPT_CATALOG[key].defaultContent,
      revision: state.prompt.revision,
      publishedVersionId: state.prompt.published_version_id,
      versions: state.versions.map((version) => ({
        id: version.id,
        version: version.version,
        content: version.content,
        changeNote: version.change_note,
        createdBy: version.created_by,
        createdAt: version.created_at,
      })),
    })),
    bills,
  };
}
