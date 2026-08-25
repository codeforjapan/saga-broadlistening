import { Badge } from "@/components/ui/badge";
import { stanceLabels } from "../../shared/constants";

interface StanceBadgeProps {
  stance: string | null;
}

const stanceClassNames: Record<string, string> = {
  for: "bg-green-50 text-green-700 border-green-200",
  against: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
};

export function StanceBadge({ stance }: StanceBadgeProps) {
  if (!stance) return <span className="text-gray-400">-</span>;

  const config = {
    label: (stanceLabels as Record<string, string>)[stance] ?? stance,
    className:
      stanceClassNames[stance] ?? "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
