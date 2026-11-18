import "server-only";

import type { ComponentProps } from "react";
import { getConfiguredModelGroups } from "@/lib/ai/model-options";
import { InterviewConfigEditClient } from "../../client/components/interview-config-edit-client";
import { generateDefaultConfigSlug } from "../../shared/utils/default-config-slug";

export function InterviewConfigEditor(
  props: Omit<
    ComponentProps<typeof InterviewConfigEditClient>,
    "modelGroups" | "initialSlug"
  >
) {
  return (
    <InterviewConfigEditClient
      {...props}
      // 乱数を含むため、サーバー側で一度だけ作ってハイドレーションのずれを防ぐ
      initialSlug={props.config ? undefined : generateDefaultConfigSlug()}
      modelGroups={getConfiguredModelGroups()}
    />
  );
}
