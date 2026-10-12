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
          すべての意見募集に共通する聞き手の人物像・初回の発話・対話方針・要約方針を編集します。下書き保存後、保存済みの版を選んで公開してください。
        </p>
        <p>
          公開すると、進行中のインタビューを含め、次の送信から反映されます。募集別の目的・質問・観点は各募集の設定画面で編集します。人物像は対話・初回・要約の3つの先頭に同じものが入ります。
        </p>
        <p>
          必須変数は削除せず、各1回残してください。話題の一覧・いまの状況（発話の残り・次の話題）・出力形式の指示は自動で挿入されます。初期文面に戻すときは「初期文面に戻す」を押してから保存・公開してください。
        </p>
      </div>
      <PromptEditor initialData={data} />
    </div>
  );
}
