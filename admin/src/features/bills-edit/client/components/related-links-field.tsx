"use client";

import {
  MAX_RELATED_LINKS,
  RELATED_LINK_KIND_LABELS,
  RELATED_LINK_KINDS,
} from "@mirai-gikai/shared/policy/related-links";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { type Control, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillCreateInput } from "../../shared/types";

interface RelatedLinksFieldProps {
  control: Control<BillCreateInput>;
}

export function RelatedLinksField({ control }: RelatedLinksFieldProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "related_links",
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>関連リンク</Label>
        <p className="text-sm text-muted-foreground mt-1">
          施策紹介ページの「関連リンク」に、上から順に表示します（最大
          {MAX_RELATED_LINKS}件）
        </p>
      </div>

      {fields.map((item, index) => (
        <RelatedLinkRow
          key={item.id}
          control={control}
          index={index}
          isFirst={index === 0}
          isLast={index === fields.length - 1}
          onMove={(to) => move(index, to)}
          onRemove={() => remove(index)}
        />
      ))}

      <FormField
        control={control}
        name="related_links"
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={fields.length >= MAX_RELATED_LINKS}
        onClick={() => append({ kind: "city_hp", label: "", url: "" })}
      >
        <Plus className="h-4 w-4" />
        関連リンクを追加
      </Button>
      <p className="text-sm text-muted-foreground">
        施策詳細ページがあるときは「施策詳細ページ」、ないときは「佐賀市HP」を選びます
      </p>
    </div>
  );
}

interface RelatedLinkRowProps {
  control: Control<BillCreateInput>;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (to: number) => void;
  onRemove: () => void;
}

function RelatedLinkRow({
  control,
  index,
  isFirst,
  isLast,
  onMove,
  onRemove,
}: RelatedLinkRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_1fr_auto] gap-3 rounded-md border p-3">
      <FormField
        control={control}
        name={`related_links.${index}.kind`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">種別</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="種別" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {RELATED_LINK_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {RELATED_LINK_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`related_links.${index}.label`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">表示名</FormLabel>
            <FormControl>
              <Input {...field} placeholder="佐賀市：奨学金返還支援" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`related_links.${index}.url`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">URL</FormLabel>
            <FormControl>
              <Input {...field} placeholder="https://www.city.saga.lg.jp/..." />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="上へ"
          disabled={isFirst}
          onClick={() => onMove(index - 1)}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="下へ"
          disabled={isLast}
          onClick={() => onMove(index + 1)}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="削除"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
