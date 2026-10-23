"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";

import { createBill } from "../../server/actions/create-bill";
import {
  type BillCreateInput,
  billCreateSchema,
  type ParentPolicyOptions,
} from "../../shared/types";
import { useBillForm } from "../hooks/use-bill-form";
import { BillFormFields } from "./bill-form-fields";

interface BillCreateFormProps {
  parentPolicyOptions: ParentPolicyOptions;
}

export function BillCreateForm({ parentPolicyOptions }: BillCreateFormProps) {
  const { isSubmitting, error, handleSubmit, handleCancel } = useBillForm();

  const form = useForm<BillCreateInput>({
    resolver: zodResolver(billCreateSchema),
    defaultValues: {
      name: "",
      slug: "",
      department: null,
      contact: null,
      thumbnail_url: null,
      share_thumbnail_url: null,
      is_featured: false,
      knowledge_source: "",
      enable_ai_chat: false,
      parent_policy_id: null,
      sort_order: 0,
      related_links: [],
    },
  });

  const onSubmit = (data: BillCreateInput) => {
    handleSubmit(() => createBill(data), "作成中にエラーが発生しました");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>施策新規作成</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <BillFormFields
              control={form.control}
              parentPolicyOptions={parentPolicyOptions}
            />

            {error && (
              <div className="rounded-md bg-yellow-400/20 p-4 text-sm text-system-warning">
                {error}
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "作成中..." : "作成"}
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
