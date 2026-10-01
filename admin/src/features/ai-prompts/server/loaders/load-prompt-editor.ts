import "server-only";
import {
  AI_PROMPT_CATALOG,
  isInterviewPromptKey,
  isPromptKey,
  type PromptGroup,
} from "@mirai-gikai/shared/prompts/catalog";
import { findPromptState } from "@mirai-gikai/shared/prompts/repository";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { listInterviewPreviewOptions } from "../repositories/interview-preview-repository";
import { listPublishedPreviewBillOptions } from "../repositories/preview-repository";

export async function loadPromptEditor(group: PromptGroup) {
  await requireAdmin();
  const keys = Object.keys(AI_PROMPT_CATALOG)
    .filter(isPromptKey)
    .filter((key) => isInterviewPromptKey(key) === (group === "interview"));
  const [states, bills, interviewConfigs] = await Promise.all([
    Promise.all(
      keys.map(async (key) => ({ key, state: await findPromptState(key) }))
    ),
    group === "public-chat"
      ? listPublishedPreviewBillOptions()
      : Promise.resolve([]),
    group === "interview" ? listInterviewPreviewOptions() : Promise.resolve([]),
  ]);
  return {
    prompts: states.map(({ key, state }) => ({
      key,
      name: AI_PROMPT_CATALOG[key].name,
      requiredVariables: AI_PROMPT_CATALOG[key].requiredVariables,
      defaultContent: AI_PROMPT_CATALOG[key].defaultContent,
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
    group,
    bills,
    interviewConfigs,
  };
}
