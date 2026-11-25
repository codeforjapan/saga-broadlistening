"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MakePrivateModal } from "@/features/interview-report/client/components/make-private-modal";
import { MakePublicModal } from "@/features/interview-report/client/components/make-public-modal";
import { InterviewSubmitDialog } from "@/features/interview-session/client/components/interview-submit-dialog";
import type { UserProfileForm } from "@/features/user-profile/client/hooks/use-user-profile-form";
import { ComponentShowcase } from "../../../_components/component-showcase";
import { PreviewSection } from "../../../_components/preview-section";
import { mockInterviewReport } from "../../../_lib/mock-data";

export default function PublicConsentModalPreview() {
  const [openConsent, setOpenConsent] = useState(false);
  const [openMakePublic, setOpenMakePublic] = useState(false);
  const [openMakePrivate, setOpenMakePrivate] = useState(false);
  const [ageGroup, setAgeGroup] = useState("");
  const [area, setArea] = useState("");
  // 表示確認用なので保存はしない
  const profileForm: UserProfileForm = {
    ageGroup,
    setAgeGroup,
    area,
    setArea,
    isLoaded: true,
    isSaving: false,
    save: async () => {},
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-foreground mb-8">
        公開設定モーダル
      </h1>

      <ComponentShowcase
        title="InterviewSubmitDialog"
        description="まとめの確認（STEP 1）・属性の質問（STEP 2）・公開設定（STEP 3）のモーダル"
      >
        <PreviewSection label="通常表示">
          <Button onClick={() => setOpenConsent(true)}>モーダルを開く</Button>
          <InterviewSubmitDialog
            open={openConsent}
            onOpenChange={setOpenConsent}
            report={mockInterviewReport}
            profileForm={profileForm}
            canRevise
            onSubmit={() => setOpenConsent(false)}
            isSubmitting={false}
          />
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase
        title="MakePublicModal"
        description="非公開→公開に切り替えるモーダル"
      >
        <PreviewSection label="通常表示">
          <Button onClick={() => setOpenMakePublic(true)}>
            モーダルを開く
          </Button>
          <MakePublicModal
            open={openMakePublic}
            onOpenChange={setOpenMakePublic}
            onConfirm={() => setOpenMakePublic(false)}
            isSubmitting={false}
          />
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase
        title="MakePrivateModal"
        description="公開→非公開に切り替えるモーダル"
      >
        <PreviewSection label="通常表示">
          <Button onClick={() => setOpenMakePrivate(true)}>
            モーダルを開く
          </Button>
          <MakePrivateModal
            open={openMakePrivate}
            onOpenChange={setOpenMakePrivate}
            onConfirm={() => setOpenMakePrivate(false)}
            isSubmitting={false}
          />
        </PreviewSection>
      </ComponentShowcase>
    </>
  );
}
