import "server-only";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { PromptEditor } from "../../client/components/prompt-editor";
import { loadPromptEditor } from "../loaders/load-prompt-editor";

export async function PublicChatPromptsPage() {
  await requireAdmin();
  const data = await loadPromptEditor("public-chat");
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">公開チャットのプロンプト</h1>
        <p className="text-sm text-muted-foreground">
          トップページと施策チャットの文面を編集します。下書き保存後、保存済みの版を選んで公開してください。
        </p>
        <p className="text-sm text-muted-foreground">
          末尾には、AIインタビューの共通プロンプトで公開した「中立的な言葉づかい」が自動で入ります。
        </p>
      </div>
      <PromptEditor initialData={data} />
    </div>
  );
}
