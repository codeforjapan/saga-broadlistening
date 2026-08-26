"use client";

import type { Control } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { BillCreateInput } from "../../shared/types";
import { ThumbnailUpload } from "./thumbnail-upload";

interface BillFormFieldsProps {
  control: Control<BillCreateInput>;
  billId?: string;
}

export function BillFormFields({ control, billId }: BillFormFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>施策名 *</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormDescription>
              施策の正式名称を入力してください（最大200文字）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Slug *</FormLabel>
            <FormControl>
              <Input {...field} placeholder="kosodate-shien" />
            </FormControl>
            <FormDescription>
              公開ページのURLに使う識別子です（重複不可・最大200文字）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>担当部署</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="こども未来部 こども政策課"
                />
              </FormControl>
              <FormDescription>
                この施策を担当する部署名を入力してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>問い合わせ先</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="0952-00-0000 / kodomo@example.lg.jp"
                />
              </FormControl>
              <FormDescription>
                市民からの問い合わせ先を入力してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="thumbnail_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>サムネイル画像</FormLabel>
            <FormControl>
              <ThumbnailUpload
                value={field.value}
                onChange={field.onChange}
                billId={billId}
              />
            </FormControl>
            <FormDescription>
              施策のサムネイル画像を設定してください（任意）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="share_thumbnail_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>シェア用OGP画像</FormLabel>
            <FormControl>
              <ThumbnailUpload
                value={field.value}
                onChange={field.onChange}
                billId={billId}
                storagePrefix="share"
              />
            </FormControl>
            <FormDescription>
              SNSでシェアされた際に表示される画像を設定してください（任意）。設定しない場合はサムネイル画像が使用されます。
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="is_featured"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>注目の施策</FormLabel>
              <FormDescription>
                トップページなどで優先的に表示されます
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="knowledge_source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ナレッジソース</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ""}
                placeholder="施策の補足情報や想定問答などを入力"
                className="min-h-[200px] resize-y"
              />
            </FormControl>
            <FormDescription>
              AIインタビュー（常時参照）と、AI質問機能（下のトグルで有効化）で使われる補足情報です。最大40,000文字。
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="enable_ai_chat"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>AI質問機能を有効にする</FormLabel>
              <FormDescription>
                ONにすると、施策ページでAIに質問できるようになります。上のナレッジソースが回答の参照情報になります。
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </>
  );
}
