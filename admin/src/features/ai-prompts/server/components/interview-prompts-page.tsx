import "server-only";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { PromptEditor } from "../../client/components/prompt-editor";
import { loadPromptEditor } from "../loaders/load-prompt-editor";

export async function InterviewPromptsPage() {
  const data = await loadPromptEditor("interview");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">AIインタビューの共通プロンプト</h1>
        <Button asChild variant="outline">
          <Link href={routes.interviews()}>インタビュー管理へ</Link>
        </Button>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          すべての意見募集に共通する対話・要約方針を編集します。下書き保存後、保存済みの版を選んで公開してください。
        </p>
        <p>
          公開すると、進行中のインタビューを含め、次の送信から反映されます。募集別の質問・深掘り指針は各募集の設定画面で編集します。
        </p>
        <p>
          必須変数は削除せず、各1回残してください。質問一覧・進捗・残り時間・出力形式の指示は自動で挿入されます。
        </p>
      </div>
      <PromptEditor initialData={data} />
    </div>
  );
}
