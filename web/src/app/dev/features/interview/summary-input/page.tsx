"use client";

import { useState } from "react";
import { policyInterviewTarget } from "@/features/interview-config/shared/types/interview-target";
import { InterviewSummaryInput } from "@/features/interview-session/client/components/interview-summary-input";
import { ComponentShowcase } from "../../../_components/component-showcase";
import { PreviewSection } from "../../../_components/preview-section";
import { mockInterviewReport } from "../../../_lib/mock-data";

export default function SummaryInputPreview() {
  const [input, setInput] = useState("");
  // 実際の画面では、まとめができたときに自動で開く
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground mb-8">
        InterviewSummaryInput
      </h1>

      <ComponentShowcase
        title="No Report（レポート未生成時の安全網）"
        description="summaryフェーズに来たがレポートを生成できなかった場合。理由を伝え、インタビュー続行/終了を選べる。"
      >
        <PreviewSection label="まとめなし">
          <div className="w-full max-w-md">
            <InterviewSummaryInput
              sessionId="mock-session-001"
              target={policyInterviewTarget("mock-bill-001")}
              latestReport={null}
              isSubmitDialogOpen={false}
              onSubmitDialogOpenChange={() => {}}
              isComplete={false}
              input={input}
              onInputChange={setInput}
              onSubmit={() => {}}
              isLoading={false}
              error={null}
            />
          </div>
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase
        title="With Report（レポート生成済み）"
        description="まとめができた通常時。まとめのモーダル（STEP 1〜3）を開き、閉じたあとは「まとめを確認する」と修正の入力欄を出す。"
      >
        <PreviewSection label="まとめあり">
          <div className="w-full max-w-md">
            <InterviewSummaryInput
              sessionId="mock-session-001"
              target={policyInterviewTarget("mock-bill-001")}
              latestReport={{
                messageId: "mock-report-message",
                report: mockInterviewReport,
              }}
              isSubmitDialogOpen={isDialogOpen}
              onSubmitDialogOpenChange={setIsDialogOpen}
              isComplete={false}
              input={input}
              onInputChange={setInput}
              onSubmit={() => {}}
              isLoading={false}
              error={null}
            />
          </div>
        </PreviewSection>
      </ComponentShowcase>
    </>
  );
}
