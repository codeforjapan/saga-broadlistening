"use server";

import "server-only";
import { isPublicPromptKey } from "@mirai-gikai/shared/prompts/catalog";
import { toHomeChatContext } from "@mirai-gikai/shared/prompts/home-chat-context";
import {
  createPromptVersion,
  findPromptState,
  publishPromptVersion,
} from "@mirai-gikai/shared/prompts/repository";
import {
  renderPromptTemplate,
  validatePromptTemplate,
} from "@mirai-gikai/shared/prompts/template";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { routes } from "@/lib/routes";
import { toBillPromptVariables } from "../../shared/utils/preview-data";
import {
  inputError,
  previewPromptSchema,
  publishPromptSchema,
  savePromptSchema,
} from "../../shared/utils/prompt-input";
import { savedPromptResult } from "../../shared/utils/save-result";
import {
  findPublishedPreviewBill,
  listHomePreviewBills,
} from "../repositories/preview-repository";

type Result =
  | {
      success: true;
      revision: number;
      version?: {
        id: string;
        version: number;
        content: string;
        changeNote: string;
        createdBy: string | null;
        createdAt: string;
      };
    }
  | { success: false; error: string; conflict?: boolean };

function mutationError(error: unknown): Result {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "40001"
  ) {
    return {
      success: false,
      error:
        "他の管理者が更新しました。入力内容を保持したまま最新状態を取得してください。",
      conflict: true,
    };
  }
  console.error("Public prompt mutation failed", error);
  return {
    success: false,
    error: "操作を完了できませんでした。時間をおいて再試行してください。",
  };
}

export async function savePublicPrompt(input: unknown): Promise<Result> {
  const actor = await requireAdmin();
  const parsed = savePromptSchema.safeParse(input);
  if (!parsed.success || !isPublicPromptKey(parsed.data.key))
    return {
      success: false,
      error: !parsed.success
        ? inputError(parsed.error)
        : "対象のプロンプトを選択してください。",
    };
  try {
    const versionId = await createPromptVersion({
      ...parsed.data,
      actorId: actor.id,
    });
    revalidatePath(routes.publicChatPrompts());
    let state: Awaited<ReturnType<typeof findPromptState>>;
    try {
      state = await findPromptState(parsed.data.key);
    } catch (error) {
      console.error("Saved public prompt could not be reloaded", error);
      return {
        success: false,
        error:
          "下書きは保存されましたが、履歴を取得できませんでした。最新状態を取得してください。",
        conflict: true,
      };
    }
    const result = savedPromptResult({
      expectedRevision: parsed.data.expectedRevision,
      savedVersionId: versionId,
      state,
    });
    if (!result)
      return {
        success: false,
        error:
          "下書きは保存されましたが、履歴に反映されていません。最新状態を取得してください。",
        conflict: true,
      };
    return result;
  } catch (error) {
    return mutationError(error);
  }
}

export async function refreshPublicPrompt(input: unknown) {
  await requireAdmin();
  if (typeof input !== "string" || !isPublicPromptKey(input)) {
    return {
      success: false as const,
      error: "対象のプロンプトを選択してください。",
    };
  }
  try {
    const state = await findPromptState(input);
    return {
      success: true as const,
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
    };
  } catch (error) {
    console.error("Public prompt refresh failed", error);
    return {
      success: false as const,
      error: "最新状態を取得できませんでした。",
    };
  }
}

export async function publishPublicPrompt(input: unknown): Promise<Result> {
  const actor = await requireAdmin();
  const parsed = publishPromptSchema.safeParse(input);
  if (!parsed.success || !isPublicPromptKey(parsed.data.key))
    return {
      success: false,
      error: !parsed.success
        ? inputError(parsed.error)
        : "対象のプロンプトを選択してください。",
    };
  try {
    const state = await findPromptState(parsed.data.key);
    const version = state.versions.find(
      (item) => item.id === parsed.data.versionId
    );
    if (!version)
      return { success: false, error: "指定した版が見つかりません。" };
    const templateErrors = validatePromptTemplate(
      parsed.data.key,
      version.content
    );
    if (templateErrors.length)
      return { success: false, error: templateErrors[0] };
    await publishPromptVersion({ ...parsed.data, actorId: actor.id });
    revalidatePath(routes.publicChatPrompts());
    return { success: true, revision: parsed.data.expectedRevision + 1 };
  } catch (error) {
    return mutationError(error);
  }
}

export async function previewPublicPrompt(
  input: unknown
): Promise<
  { success: true; content: string } | { success: false; error: string }
> {
  await requireAdmin();
  const parsed = previewPromptSchema.safeParse(input);
  if (!parsed.success || !isPublicPromptKey(parsed.data.key))
    return {
      success: false,
      error: !parsed.success
        ? inputError(parsed.error)
        : "対象のプロンプトを選択してください。",
    };
  try {
    if (parsed.data.key === "top-chat-system") {
      const bills = await listHomePreviewBills();
      return {
        success: true,
        content: renderPromptTemplate(parsed.data.key, parsed.data.content, {
          billSummary: JSON.stringify(
            bills.map((bill) =>
              toHomeChatContext({
                policyName: bill.name,
                title: bill.title,
                summary: bill.summary,
                tags: bill.tags,
                isFeatured: bill.isFeatured,
              })
            )
          ),
        }),
      };
    }
    const bill = await findPublishedPreviewBill(
      parsed.data.billId ?? "",
      parsed.data.key === "bill-chat-system-hard" ? "hard" : "normal"
    );
    if (!bill)
      return { success: false, error: "公開済みの施策が見つかりません。" };
    return {
      success: true,
      content: renderPromptTemplate(
        parsed.data.key,
        parsed.data.content,
        toBillPromptVariables(bill)
      ),
    };
  } catch (error) {
    console.error("Public prompt preview failed", error);
    return { success: false, error: "プレビューを作成できませんでした。" };
  }
}
