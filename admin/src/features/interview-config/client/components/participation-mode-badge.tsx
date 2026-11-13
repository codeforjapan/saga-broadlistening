import {
  type InterviewParticipationMode,
  PARTICIPATION_MODE_LABELS,
} from "@mirai-gikai/shared/interview-participation/participation-mode";
import { Badge } from "@/components/ui/badge";

/**
 * テーマ一覧に出す「回答できる人」のバッジ。
 * 既定（public）で回答が開放されるため、外部ID必須のテーマを目立たせる。
 */
export function ParticipationModeBadge({
  mode,
}: {
  mode: InterviewParticipationMode;
}) {
  return (
    <Badge
      variant={mode === "external_identity" ? "default" : "outline"}
      className="whitespace-nowrap"
    >
      {PARTICIPATION_MODE_LABELS[mode]}
    </Badge>
  );
}
