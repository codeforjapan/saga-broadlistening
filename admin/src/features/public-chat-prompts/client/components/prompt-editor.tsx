"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  previewPublicPrompt,
  publishPublicPrompt,
  refreshPublicPrompt,
  savePublicPrompt,
} from "../../server/actions/prompt-actions";
import type { loadPromptEditor } from "../../server/loaders/load-prompt-editor";
import { PromptDiff } from "./prompt-diff";
import { PromptHistory } from "./prompt-history";

type EditorData = Awaited<ReturnType<typeof loadPromptEditor>>;
type Prompt = EditorData["prompts"][number];

export function PromptEditor({ initialData }: { initialData: EditorData }) {
  const [prompts, setPrompts] = useState(initialData.prompts);
  const [selectedKey, setSelectedKey] =
    useState<Prompt["key"]>("top-chat-system");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [content, setContent] = useState(
    prompts[0]?.versions[0]?.content ?? prompts[0]?.defaultContent ?? ""
  );
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState("");
  const [billId, setBillId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();
  const prompt = prompts.find((item) => item.key === selectedKey) ?? prompts[0];
  const selectedVersion = prompt?.versions.find(
    (item) => item.id === selectedVersionId
  );
  const baseline =
    selectedVersion?.content ??
    (selectedVersionId === null && prompt?.versions.length
      ? prompt.versions[0].content
      : (prompt?.defaultContent ?? ""));
  const dirty = content !== baseline;
  const published = prompt?.versions.find(
    (item) => item.id === prompt.publishedVersionId
  );
  const comparison = published?.content ?? prompt?.defaultContent ?? "";

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (!prompt) return null;

  function selectPrompt(next: Prompt) {
    if (dirty && !window.confirm("未保存の編集内容を破棄して切り替えますか？"))
      return;
    setSelectedKey(next.key);
    setSelectedVersionId(null);
    setContent(next.versions[0]?.content ?? next.defaultContent);
    setNote("");
    setPreview("");
    setError("");
    setConflict(false);
    setMessage("");
    setBillId("");
  }

  function selectVersion(version: Prompt["versions"][number]) {
    if (
      dirty &&
      !window.confirm("未保存の編集内容を破棄して版を読み込みますか？")
    )
      return;
    setSelectedVersionId(version.id);
    setContent(version.content);
    setPreview("");
    setError("");
    setConflict(false);
    setMessage("");
  }

  function save() {
    setError("");
    setConflict(false);
    setMessage("");
    startTransition(async () => {
      try {
        const result = await savePublicPrompt({
          key: prompt.key,
          content,
          changeNote: note,
          expectedRevision: prompt.revision,
        });
        if (!result.success) {
          setError(result.error);
          setConflict(result.conflict ?? false);
          return;
        }
        const newVersion = result.version;
        if (!newVersion) {
          setError(
            "保存した版を取得できませんでした。最新状態を取得してください。"
          );
          setConflict(true);
          return;
        }
        setPrompts((current) =>
          current.map((item) =>
            item.key === prompt.key
              ? {
                  ...item,
                  revision: result.revision,
                  versions: [newVersion, ...item.versions],
                }
              : item
          )
        );
        setSelectedVersionId(newVersion.id);
        setNote("");
        setMessage(
          `第${newVersion.version}版を下書き保存しました。公開は別の操作です。`
        );
      } catch {
        setError("保存できませんでした。ログイン状態を確認してください。");
      }
    });
  }

  function publish() {
    if (!selectedVersion || dirty) {
      setError(
        "公開する保存済み版を選び、未保存の編集を先に保存してください。"
      );
      return;
    }
    if (!note.trim()) {
      setError("公開理由を入力してください。");
      return;
    }
    if (
      !window.confirm(
        `第${selectedVersion.version}版を公開します。本文と差分を確認しましたか？`
      )
    )
      return;
    setError("");
    setConflict(false);
    setMessage("");
    startTransition(async () => {
      try {
        const result = await publishPublicPrompt({
          key: prompt.key,
          versionId: selectedVersion.id,
          changeNote: note,
          expectedRevision: prompt.revision,
        });
        if (!result.success) {
          setError(result.error);
          setConflict(result.conflict ?? false);
          return;
        }
        setPrompts((current) =>
          current.map((item) =>
            item.key === prompt.key
              ? {
                  ...item,
                  revision: result.revision,
                  publishedVersionId: selectedVersion.id,
                }
              : item
          )
        );
        setNote("");
        setMessage(
          `第${selectedVersion.version}版を公開しました。次のチャット送信から使われます。`
        );
      } catch {
        setError("公開できませんでした。ログイン状態を確認してください。");
      }
    });
  }

  function runPreview() {
    setError("");
    setPreview("");
    startTransition(async () => {
      try {
        const result = await previewPublicPrompt({
          key: prompt.key,
          content,
          billId: billId || undefined,
        });
        if (result.success) setPreview(result.content);
        else setError(result.error);
      } catch {
        setError(
          "プレビューできませんでした。ログイン状態を確認してください。"
        );
      }
    });
  }

  function refresh() {
    startTransition(async () => {
      try {
        const result = await refreshPublicPrompt(prompt.key);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setPrompts((current) =>
          current.map((item) =>
            item.key === prompt.key
              ? {
                  ...item,
                  revision: result.revision,
                  publishedVersionId: result.publishedVersionId,
                  versions: result.versions,
                }
              : item
          )
        );
        setConflict(false);
        setError("");
        setMessage(
          "最新状態を取得しました。編集中の本文は保持しています。差分を確認してください。"
        );
      } catch {
        setError("最新状態を取得できませんでした。");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="プロンプト選択"
      >
        {prompts.map((item) => (
          <Button
            key={item.key}
            type="button"
            variant={item.key === prompt.key ? "default" : "outline"}
            disabled={pending}
            onClick={() => selectPrompt(item)}
          >
            {item.name}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{prompt.name}</h2>
        <p className="text-sm text-muted-foreground">
          公開中:{" "}
          {published
            ? `第${published.version}版`
            : "公開版は未設定のため、初期文面を使用中です"}
          。
        </p>
        <p className="text-sm text-muted-foreground">
          編集欄:{" "}
          {selectedVersion
            ? `保存済み第${selectedVersion.version}版`
            : prompt.versions.length
              ? `最新の第${prompt.versions[0].version}版`
              : "初期文面"}
          。
          {dirty
            ? "未保存の変更があります。"
            : prompt.versions.length
              ? "保存済み本文です。"
              : "まだ保存されていません。"}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="prompt-content">プロンプト本文</Label>
        <Textarea
          id="prompt-content"
          value={content}
          disabled={pending}
          rows={20}
          className="font-mono"
          onChange={(event) => {
            setContent(event.target.value);
            setPreview("");
            setMessage("");
          }}
        />
        <p className="text-xs text-muted-foreground">
          必須変数:{" "}
          {prompt.key === "top-chat-system"
            ? "{{billSummary}}"
            : "{{billName}}、{{billTitle}}、{{billSummary}}、{{billContent}}、{{knowledgeSourceSection}}"}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="prompt-note">変更・公開理由</Label>
        <Input
          id="prompt-note"
          value={note}
          disabled={pending}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
          placeholder="何を変更・公開するか記録してください"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending || !note.trim()}
            onClick={save}
          >
            下書きを保存
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              pending ||
              dirty ||
              !selectedVersion ||
              !note.trim() ||
              prompt.publishedVersionId === selectedVersion?.id
            }
            onClick={publish}
          >
            {selectedVersion &&
            published &&
            selectedVersion.version < published.version
              ? "この版に復旧"
              : "選択中の保存済み版を公開"}
          </Button>
        </div>
        {dirty && (
          <p className="text-sm text-muted-foreground">
            公開するには、まず現在の編集内容を下書き保存してください。
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {conflict && (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={refresh}
        >
          最新状態を取得（入力を保持）
        </Button>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">プレビュー</h2>
        <p className="text-sm text-muted-foreground">
          編集中の本文を公開データに当てはめます。AIへの送信は行いません。トップページは「ふつう」の施策一覧を使用します。
        </p>
        {prompt.key !== "top-chat-system" && (
          <div className="space-y-2">
            <Label htmlFor="preview-bill">公開済み施策</Label>
            <select
              id="preview-bill"
              className="w-full rounded-md border border-input bg-background p-2"
              value={billId}
              disabled={pending}
              onChange={(event) => {
                setBillId(event.target.value);
                setPreview("");
              }}
            >
              <option value="">施策を選択</option>
              {initialData.bills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={pending || (prompt.key !== "top-chat-system" && !billId)}
          onClick={runPreview}
        >
          本文をプレビュー
        </Button>
        {preview && (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-4 text-xs">
            {preview}
          </pre>
        )}
      </section>
      <PromptDiff
        original={comparison}
        current={content}
        publishedVersion={published?.version}
      />
      <PromptHistory
        prompt={prompt}
        pending={pending}
        onSelect={selectVersion}
      />
    </div>
  );
}
