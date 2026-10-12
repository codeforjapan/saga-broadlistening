"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewQuestionInput } from "../../shared/types";
import { arrayToText, textToArray } from "../../shared/types";

interface InterviewQuestionFormProps {
  onSubmit: (question: InterviewQuestionInput) => void;
  onCancel?: () => void;
  initialData?: InterviewQuestionInput;
  submitLabel?: string;
}

export function InterviewQuestionForm({
  onSubmit,
  onCancel,
  initialData,
  submitLabel = "追加",
}: InterviewQuestionFormProps) {
  const questionId = useId();
  const hintId = useId();
  const quickRepliesId = useId();
  const [question, setQuestion] = useState(initialData?.question || "");
  const [hint, setHint] = useState(initialData?.hint || "");
  const [quickRepliesText, setQuickRepliesText] = useState(
    arrayToText(initialData?.quick_replies)
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      return;
    }

    onSubmit({
      // テンプレートの値（種類・予算・必須）は職員に見せず、そのまま引き継ぐ
      step_key: initialData?.step_key,
      step_kind: initialData?.step_kind,
      turn_budget: initialData?.turn_budget,
      required: initialData?.required,
      question: question.trim(),
      hint: hint.trim() || undefined,
      quick_replies:
        quickRepliesText.trim() !== ""
          ? textToArray(quickRepliesText)
          : undefined,
    });

    // フォームをリセット
    setQuestion("");
    setHint("");
    setQuickRepliesText("");
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // フォームをリセット
      setQuestion("");
      setHint("");
      setQuickRepliesText("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border rounded-lg p-4 bg-gray-50"
    >
      <div className="space-y-2">
        <Label htmlFor={questionId}>
          質問文 <span className="text-system-warning">*</span>
        </Label>
        <Input
          id={questionId}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="質問文を入力"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={hintId}>観点（任意）</Label>
        <Textarea
          id={hintId}
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="聞けたら話が豊かになる観点（例：いつ・どこで・誰と）。2つまでが目安です"
          className="min-h-[80px] resize-y"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={quickRepliesId}>クイックリプライ（任意）</Label>
        <Textarea
          id={quickRepliesId}
          value={quickRepliesText}
          onChange={(e) => setQuickRepliesText(e.target.value)}
          placeholder="クイックリプライを改行区切りで入力（例：&#10;賛成&#10;反対&#10;どちらとも言えない）"
          className="min-h-[80px] resize-y"
        />
        <p className="text-sm text-gray-500">
          各クイックリプライを1行ずつ入力してください
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit">{submitLabel}</Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );
}
