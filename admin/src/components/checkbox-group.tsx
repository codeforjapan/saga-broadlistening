"use client";

import { Checkbox } from "@/components/ui/checkbox";

export type CheckboxGroupOption = { id: string; label: string };

/** 複数選択のチェックボックス群。選択中の id 配列を値として扱う */
export function CheckboxGroup({
  options,
  value,
  onChange,
  idPrefix,
  className,
}: {
  options: CheckboxGroupOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** DOM id の衝突を避ける接頭辞 */
  idPrefix: string;
  className?: string;
}) {
  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...value, id] : value.filter((v) => v !== id));
  };

  return (
    <div className={className ?? "space-y-2 rounded-md border p-3"}>
      {options.map((option) => {
        const checkboxId = `${idPrefix}-${option.id}`;
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
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
