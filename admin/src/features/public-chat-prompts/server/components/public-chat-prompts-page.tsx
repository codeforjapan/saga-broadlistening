import "server-only";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { PromptEditor } from "../../client/components/prompt-editor";
import { loadPromptEditor } from "../loaders/load-prompt-editor";

export async function PublicChatPromptsPage() {
  await requireAdmin();
  const data = await loadPromptEditor();
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">公開チャットのプロンプト</h1>
        <p className="text-sm text-muted-foreground">
          トップページと施策チャットの文面を編集します。下書き保存後、保存済みの版を選んで公開してください。
        </p>
      </div>
      <PromptEditor initialData={data} />
    </main>
  );
}
