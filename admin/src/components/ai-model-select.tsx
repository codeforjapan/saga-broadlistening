"use client";

import type { ComponentProps } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ModelGroup = {
  provider: string;
  options: { value: string; label: string; estimatedCost: string | null }[];
};

export function AiModelSelect({
  value,
  onValueChange,
  groups,
  showEstimatedCost = false,
  disabled = false,
  defaultModelAvailable = true,
  ...triggerProps
}: {
  value: string | null;
  onValueChange: (value: string | null) => void;
  groups: ModelGroup[];
  showEstimatedCost?: boolean;
  disabled?: boolean;
  defaultModelAvailable?: boolean;
} & Pick<
  ComponentProps<typeof SelectTrigger>,
  "id" | "aria-invalid" | "aria-describedby" | "ref" | "onBlur"
>) {
  const hasSelectedModel = groups.some((group) =>
    group.options.some((option) => option.value === value)
  );
  return (
    <Select
      value={value ?? "__default__"}
      onValueChange={(next) =>
        onValueChange(next === "__default__" ? null : next)
      }
      disabled={disabled}
    >
      <SelectTrigger {...triggerProps} className="w-full">
        <SelectValue placeholder="モデルを選択" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__default__" disabled={!defaultModelAvailable}>
          デフォルト（環境の既定モデル）
        </SelectItem>
        {value && !hasSelectedModel && (
          <SelectItem value={value}>{value}（保存済み）</SelectItem>
        )}
        {groups.map((group) => (
          <SelectGroup key={group.provider}>
            <SelectLabel>{group.provider}</SelectLabel>
            {group.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
                {showEstimatedCost && option.estimatedCost && (
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
  );
}
