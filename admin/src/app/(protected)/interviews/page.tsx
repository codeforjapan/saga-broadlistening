import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentAdmin } from "@/features/auth/server/lib/auth-server";
import { AllInterviewConfigList } from "@/features/interviews/server/components/all-interview-config-list";
import {
  getAllInterviewConfigs,
  getSessionCountsForConfigs,
} from "@/features/interviews/server/loaders/get-all-interview-configs";
import { routes } from "@/lib/routes";

export default async function InterviewsPage() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect(routes.login());
  }

  const configs = await getAllInterviewConfigs();
  const sessionCounts = await getSessionCountsForConfigs(
    configs.map((config) => config.id)
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">インタビュー管理</h1>
        <Button asChild>
          <Link href={routes.interviewNew() as Route}>
            <Plus className="h-4 w-4" />
            意見募集を作成
          </Link>
        </Button>
      </div>

      <section className="rounded-lg border bg-white p-6">
        <AllInterviewConfigList
          configs={configs}
          sessionCounts={sessionCounts}
        />
      </section>
    </div>
  );
}
