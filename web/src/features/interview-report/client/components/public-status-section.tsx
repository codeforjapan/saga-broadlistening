"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updatePublicSetting } from "../../server/actions/update-public-setting";
import { MakePrivateModal } from "./make-private-modal";
import { MakePublicModal } from "./make-public-modal";

interface PublicStatusSectionProps {
  sessionId: string;
  initialIsPublic: boolean;
}

export function PublicStatusSection({
  sessionId,
  initialIsPublic,
}: PublicStatusSectionProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePublicStatus = async () => {
    setIsSubmitting(true);
    try {
      const newStatus = !isPublic;
      // 公開・非公開いずれの切替でも二次利用同意を連動して送る。
      // 公開への切替は告知付きモーダル（MakePublicModal）で確認済みの同意、
      // 非公開への切替は同意の撤回（false）にあたる
      const result = await updatePublicSetting(sessionId, newStatus, newStatus);
      if (result.success) {
        setIsPublic(newStatus);
        setIsModalOpen(false);
      } else {
        console.error("Failed to update public setting:", result.error);
      }
    } catch (err) {
      console.error("Failed to update public setting:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        {isPublic ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-bold text-primary-accent">
            <span aria-hidden="true" className="size-2 rounded-full bg-decor" />
            公開中
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-bold text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-muted-foreground"
            />
            非公開
          </span>
        )}
        <Button
          variant="link"
          onClick={() => setIsModalOpen(true)}
          className={`text-sm ${isPublic ? "text-muted-foreground" : "text-primary-accent"}`}
        >
          {isPublic ? "非公開に変更する" : "公開に変更する"}
        </Button>
      </div>

      {isPublic ? (
        <MakePrivateModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onConfirm={handleChangePublicStatus}
          isSubmitting={isSubmitting}
        />
      ) : (
        <MakePublicModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onConfirm={handleChangePublicStatus}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
}
