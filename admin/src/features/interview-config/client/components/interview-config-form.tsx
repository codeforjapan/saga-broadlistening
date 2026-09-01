"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { MutableRefObject } from "react";
import { useEffect, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ThumbnailUpload } from "@/features/bills-edit/client/components/thumbnail-upload";
import { routes } from "@/lib/routes";
import { generateInterviewPreviewUrl } from "../../server/actions/generate-interview-preview-url";
import {
  createInterviewConfig,
  updateInterviewConfig,
} from "../../server/actions/upsert-interview-config";
import {
  arrayToText,
  type InterviewConfig,
  type InterviewConfigInput,
  interviewConfigSchema,
} from "../../shared/types";
import {
  CHAT_MODEL_GROUPS,
  DEFAULT_MODEL_LABEL,
} from "../../shared/utils/chat-model-options";
import { generateDefaultConfigName } from "../../shared/utils/default-config-name";

/** 紐づけ先として選べる施策 */
export type PolicyOption = { id: string; name: string };

/**
 * フォームの現在値。保存時に渡す形と同じで、任意項目は null に揃えてある。
 * 読み手（AI生成からの自動作成・シミュレーション）が undefined を都度潰さずに済む。
 */
export type InterviewConfigFormValues = InterviewConfigInput & {
  description: string | null;
  chat_model: string | null;
  estimated_duration: number | null;
};

interface InterviewConfigFormProps {
  /**
   * 施策配下のフォームから開いたときの施策ID。
   * テーマ単独のフォーム（抽象テーマ型）では null になる。
   * プレビューは施策単位で発行するため、null のときは出さない。
   */
  billId: string | null;
  config: InterviewConfig | null;
  aiGeneratedThemes?: string[] | null;
  onAiThemesApplied?: () => void;
  onConfigCreated?: (configId: string) => Promise<void>;
  /** 親コンポーネントがフォームの現在値を読むための ref */
  getFormValuesRef?: MutableRefObject<(() => InterviewConfigFormValues) | null>;
  /** 新規作成時の設定名初期値（ログインユーザー名） */
  initialName?: string | null;
  /**
   * 紐づけ先として選べる施策の一覧。渡されたときだけ紐づけ欄を出す。
   * 施策配下のフォームでは渡さず、その施策との紐づけを維持する。
   */
  policyOptions?: PolicyOption[];
  /** 現在紐づいている施策のID一覧 */
  linkedPolicyIds?: string[];
}

export function InterviewConfigForm({
  billId,
  config,
  aiGeneratedThemes,
  onAiThemesApplied,
  onConfigCreated,
  getFormValuesRef,
  initialName,
  policyOptions,
  linkedPolicyIds,
}: InterviewConfigFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNew = !config;
  // 紐づけ欄を出すかどうか。施策配下のフォームでは出さず、その施策との紐づけを維持する
  const canEditPolicyLinks = policyOptions !== undefined;

  const form = useForm<InterviewConfigInput>({
    resolver: zodResolver(interviewConfigSchema),
    defaultValues: {
      name: config?.name || initialName || generateDefaultConfigName(),
      slug: config?.slug || "",
      status: config?.status || "draft",
      description: config?.description ?? "",
      chat_model: config?.chat_model || null,
      estimated_duration: isNew ? 10 : (config?.estimated_duration ?? null),
      thumbnail_url: config?.thumbnail_url ?? null,
      // 紐づけ欄を出さないフォームでは undefined のままにして、保存時に紐づけへ触れない
      policy_ids: canEditPolicyLinks ? (linkedPolicyIds ?? []) : undefined,
    },
  });

  // 親コンポーネントからフォーム値を読み取れるようにする。
  // AI生成からの自動作成もこの値をそのまま保存するため、一部だけ返さないこと
  useEffect(() => {
    if (getFormValuesRef) {
      getFormValuesRef.current = () => {
        const values = form.getValues();
        return {
          ...values,
          description: values.description ?? null,
          chat_model: values.chat_model || null,
          estimated_duration: values.estimated_duration ?? null,
        };
      };
    }
  }, [form, getFormValuesRef]);

  // AI生成テーマの反映
  useEffect(() => {
    if (aiGeneratedThemes && aiGeneratedThemes.length > 0) {
      form.setValue("description", arrayToText(aiGeneratedThemes), {
        shouldDirty: true,
      });
      onAiThemesApplied?.();
      toast.success(`AIが${aiGeneratedThemes.length}件のテーマを設定しました`);
    }
  }, [aiGeneratedThemes, form, onAiThemesApplied]);

  const handleSubmit = async (data: InterviewConfigInput) => {
    setIsSubmitting(true);
    try {
      const result = isNew
        ? await createInterviewConfig({
            ...data,
            // 施策配下の新規作成では、開いている施策との紐づけを必ず作る。
            // 更新は policy_ids を送らない（＝紐づけに触れない）ままにして、
            // 他の施策との紐づけを失わないようにする
            policy_ids: billId ? [billId] : (data.policy_ids ?? []),
          })
        : await updateInterviewConfig(config.id, data);

      if (result.success) {
        if (isNew) {
          // 新規作成時: 質問があればコールバックで保存してから遷移
          if (onConfigCreated) {
            await onConfigCreated(result.data.id);
          }
          toast.success("インタビュー設定を作成しました");
          router.push(
            (billId
              ? routes.billInterviewEdit(billId, result.data.id)
              : routes.interviewEdit(result.data.id)) as Route
          );
        } else {
          toast.success("インタビュー設定を保存しました");
          router.refresh();
        }
      } else {
        toast.error(result.error || "エラーが発生しました");
      }
    } catch (error) {
      console.error("Error submitting interview config:", error);
      toast.error("予期しないエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 入力欄の外（紐づく施策・サムネイル）で弾かれると画面に何も出ず、
  // 保存ボタンが無反応に見えるため、まとめて知らせる
  const handleInvalid = (errors: FieldErrors<InterviewConfigInput>) => {
    console.error("Interview config validation error:", errors);
    toast.error("入力内容を確認してください");
  };

  const [isPreviewing, setIsPreviewing] = useState(false);
  const handlePreview = async () => {
    if (!config || !billId) {
      toast.error("プレビューは施策に紐づく設定を保存した後に利用できます");
      return;
    }

    // プレビューの前に保存を実行
    const data = form.getValues();
    const isValid = await form.trigger();
    if (!isValid) {
      toast.error("入力内容を確認してください");
      return;
    }

    setIsPreviewing(true);
    try {
      // 1. 保存
      const saveResult = await updateInterviewConfig(config.id, data);
      if (!saveResult.success) {
        toast.error(saveResult.error || "保存に失敗しました");
        return;
      }

      // 2. プレビューURL生成
      const result = await generateInterviewPreviewUrl(billId);

      if (result.success && result.url) {
        window.open(result.url, "_blank");
      } else {
        toast.error(result.error || "プレビューURLの生成に失敗しました");
      }
    } catch (error) {
      console.error("Preview URL generation failed:", error);
      toast.error("プレビューURLの生成中にエラーが発生しました");
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="space-y-4">
      {config && billId && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={isPreviewing}
          >
            <Eye className="mr-2 h-4 w-4" />
            {isPreviewing ? "準備中..." : "プレビュー"}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>インタビュー設定</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>設定名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例: デフォルト設定、A/Bテスト用など"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      設定を識別するための名前を入力してください
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="saga-no-mirai" {...field} />
                    </FormControl>
                    <FormDescription>
                      公開ページのURLに使う識別子です（重複不可）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ステータス</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="ステータスを選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">下書き</SelectItem>
                        <SelectItem value="open">募集中</SelectItem>
                        <SelectItem value="closed">終了</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      意見募集の状態を設定します。募集中にできるのは施策ごとに1つのみです（施策に紐づかないテーマはこの制限を受けません）。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chat_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AIモデル</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "__default__" ? null : value)
                      }
                      value={field.value ?? "__default__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="モデルを選択" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__default__">
                          デフォルト（{DEFAULT_MODEL_LABEL}）
                        </SelectItem>
                        {CHAT_MODEL_GROUPS.map((group) => (
                          <SelectGroup key={group.provider}>
                            <SelectLabel>{group.provider}</SelectLabel>
                            {group.options.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                                {option.estimatedCost && (
                                  <span className="ml-2 text-muted-foreground">
                                    {option.estimatedCost}/回
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      インタビュー対話に使用するAIモデルを選択します。コストは1インタビューあたりの推定値です。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目安時間（分）</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="例: 15"
                        min={1}
                        max={180}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(
                            val === "" ? null : Number.parseInt(val, 10)
                          );
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      設定するとインタビュー中に残り時間が表示されます。未設定の場合は時間制限なしです。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>テーマの説明</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="意見を募集するテーマの説明を入力"
                        className="min-h-[100px] resize-y"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      職員が設定するテーマの説明文です。AIへの指示材料にもなります
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {policyOptions && (
                <FormField
                  control={form.control}
                  name="policy_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>紐づく施策</FormLabel>
                      <FormDescription>
                        この意見募集を紐づける施策を選びます。1件も選ばない場合は、特定の施策に紐づかないテーマ（抽象テーマ）になります。
                      </FormDescription>
                      <PolicyLinkCheckboxes
                        options={policyOptions}
                        value={field.value ?? []}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="thumbnail_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>サムネイル画像</FormLabel>
                    <FormDescription>
                      テーマ一覧のカードに表示する画像です。未設定の場合は紐づく施策の画像を使います。
                    </FormDescription>
                    {/* billId はファイル名の接頭辞にしか使われないため、
                        意見募集のIDを渡してテーマごとのファイル名にする */}
                    <ThumbnailUpload
                      value={field.value ?? null}
                      onChange={field.onChange}
                      billId={config?.id}
                      storagePrefix="interview"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

/** 紐づける施策を複数選ぶチェックボックス群 */
function PolicyLinkCheckboxes({
  options,
  value,
  onChange,
}: {
  options: PolicyOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="text-sm text-gray-500">紐づけられる施策がありません。</p>
    );
  }

  const toggle = (policyId: string, checked: boolean) => {
    onChange(
      checked ? [...value, policyId] : value.filter((id) => id !== policyId)
    );
  };

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
      {options.map((option) => {
        const checkboxId = `policy-link-${option.id}`;
        return (
          <label
            key={option.id}
            htmlFor={checkboxId}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <Checkbox
              id={checkboxId}
              checked={value.includes(option.id)}
              onCheckedChange={(checked) => toggle(option.id, checked === true)}
            />
            <span>{option.name}</span>
          </label>
        );
      })}
    </div>
  );
}
