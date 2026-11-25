"use client";

import { ArrowRight } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserProfileForm } from "@/features/user-profile/client/hooks/use-user-profile-form";
import {
  AGE_GROUP_OPTIONS,
  AREA_OPTIONS,
  type UserProfileOption,
} from "@/features/user-profile/shared/constants/user-profile-options";
import { InterviewStepFrame } from "./interview-step-dialog";

interface InterviewProfileStepProps {
  form: UserProfileForm;
  onBack: () => void;
  /** 「次へ」「スキップ」のどちらでも呼ぶ。何も選ばなくても進める */
  onNext: () => void;
}

/** STEP 2：属性の質問（#275）。答えたくない項目はとばせる */
export function InterviewProfileStep({
  form,
  onBack,
  onNext,
}: InterviewProfileStepProps) {
  const handleNext = async () => {
    await form.save();
    onNext();
  };

  return (
    <InterviewStepFrame
      step={2}
      onBack={onBack}
      title="あなたについて教えてください"
      description="答えたくない項目は、とばしても大丈夫です。"
      footer={
        <>
          <Button
            onClick={handleNext}
            disabled={!form.isLoaded || form.isSaving}
          >
            {form.isSaving ? "保存中..." : "次へ"}
            {!form.isSaving && <ArrowRight className="size-5" />}
          </Button>
          <Button
            variant="ghost"
            onClick={onNext}
            disabled={form.isSaving}
            className="text-muted-foreground"
          >
            スキップ
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <ProfileSelect
          label="年代"
          value={form.ageGroup}
          onValueChange={form.setAgeGroup}
          options={AGE_GROUP_OPTIONS}
        />
        <ProfileSelect
          label="住んでいるエリア"
          value={form.area}
          onValueChange={form.setArea}
          options={AREA_OPTIONS}
        />
      </div>
    </InterviewStepFrame>
  );
}

function ProfileSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly UserProfileOption[];
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[15px] font-bold">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          className="h-12 w-full rounded-xl border-border bg-white px-4 text-base data-[size=default]:h-12"
        >
          <SelectValue placeholder="選択してください" />
        </SelectTrigger>
        <SelectContent className="theme-interview">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
