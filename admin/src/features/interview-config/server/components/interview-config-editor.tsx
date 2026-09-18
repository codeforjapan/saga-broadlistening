import "server-only";

import type { ComponentProps } from "react";
import { getConfiguredModelGroups } from "@/lib/ai/model-options";
import { InterviewConfigEditClient } from "../../client/components/interview-config-edit-client";

export function InterviewConfigEditor(
  props: Omit<ComponentProps<typeof InterviewConfigEditClient>, "modelGroups">
) {
  return (
    <InterviewConfigEditClient
      {...props}
      modelGroups={getConfiguredModelGroups()}
    />
  );
}
