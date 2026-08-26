import { Badge } from "@/components/ui/badge";
import type { PersonaCharacterSheet } from "../../shared/schemas";

interface StanceBadgeProps {
  stance: PersonaCharacterSheet["stance"];
}

const STANCE_LABELS: Record<StanceBadgeProps["stance"], string> = {
  for: "賛成",
  against: "反対",
  neutral: "中立",
};

const STANCE_CLASS_NAMES: Record<StanceBadgeProps["stance"], string> = {
  for: "bg-green-50 text-green-700 border-green-200",
  against: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
};

/**
 * ペルソナの立場を表すバッジ。
 *
 * Epic #54 で opinions から stance カラムが廃止されたため、
 * 賛否の表示はインタビューシミュレーションのペルソナ限定になった。
 */
export function StanceBadge({ stance }: StanceBadgeProps) {
  return (
    <Badge variant="outline" className={STANCE_CLASS_NAMES[stance]}>
      {STANCE_LABELS[stance]}
    </Badge>
  );
}
