"use client";

import type { Control } from "react-hook-form";
import {
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BillCreateInput, ParentPolicyOptions } from "../../shared/types";

// Radix の Select は空文字を値にできないため、「親なし」を表す値を別に持つ
const NO_PARENT_VALUE = "__none__";

interface PolicyHierarchyFieldsProps {
  control: Control<BillCreateInput>;
  parentPolicyOptions: ParentPolicyOptions;
}

export function PolicyHierarchyFields({
  control,
  parentPolicyOptions,
}: PolicyHierarchyFieldsProps) {
  const { options, hasChildren } = parentPolicyOptions;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        control={control}
        name="parent_policy_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>親施策</FormLabel>
            <Select
              value={field.value ?? NO_PARENT_VALUE}
              onValueChange={(value) =>
                field.onChange(value === NO_PARENT_VALUE ? null : value)
              }
              disabled={hasChildren}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="親施策を選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NO_PARENT_VALUE}>なし</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              {hasChildren
                ? "この施策は子施策を持つ親施策のため、他の施策の子にはできません"
                : "テーマの親ページ（例: 若者支援）の配下に置くときに選びます。親子は1階層までです"}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="sort_order"
        render={({ field }) => (
          <FormItem>
            <FormLabel>並び順</FormLabel>
            <FormControl>
              <Input
                type="number"
                step={1}
                value={field.value ?? 0}
                onChange={(event) =>
                  field.onChange(
                    event.target.value === "" ? 0 : event.target.valueAsNumber
                  )
                }
              />
            </FormControl>
            <FormDescription>
              小さいほど先に表示します（TOPのテーマカード、親施策ページの関連施策）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
