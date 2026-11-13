"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { parseRelatedLinks } from "@mirai-gikai/shared/policy/related-links";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";

import { updateBill } from "../../server/actions/update-bill";
import {
  type Bill,
  type BillUpdateInput,
  billUpdateSchema,
  type ParentPolicyOptions,
} from "../../shared/types";
import { useBillForm } from "../hooks/use-bill-form";
import { BillFormFields } from "./bill-form-fields";

interface BillEditFormProps {
  bill: Bill;
  parentPolicyOptions: ParentPolicyOptions;
}

export function BillEditForm({ bill, parentPolicyOptions }: BillEditFormProps) {
  const { isSubmitting, error, handleSubmit, handleCancel } = useBillForm();

  const form = useForm<BillUpdateInput>({
    resolver: zodResolver(billUpdateSchema),
    defaultValues: {
      name: bill.name,
      slug: bill.slug,
      department: bill.department,
      contact: bill.contact,
      thumbnail_url: bill.thumbnail_url,
      share_thumbnail_url: bill.share_thumbnail_url,
      is_featured: bill.is_featured,
      knowledge_source: bill.knowledge_source ?? "",
      enable_ai_chat: bill.enable_ai_chat,
      parent_policy_id: bill.parent_policy_id,
      sort_order: bill.sort_order,
      // DB の値は admin の保存時に検証済み。形の合わない要素（手で入れた不正値）は
      // フォームに出さず、次の保存で取り除く
      related_links: parseRelatedLinks(bill.related_links),
    },
  });

  const onSubmit = (data: BillUpdateInput) => {
    handleSubmit(
      () => updateBill(bill.id, data),
      "更新中にエラーが発生しました"
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>施策基本情報編集</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <BillFormFields
              control={form.control}
              billId={bill.id}
              parentPolicyOptions={parentPolicyOptions}
            />

            {error && (
              <div className="rounded-md bg-yellow-400/20 p-4 text-sm text-system-warning">
                {error}
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "保存中..." : "保存"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
