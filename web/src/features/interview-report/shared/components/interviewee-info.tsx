import { UsersRound } from "lucide-react";
import { HeadingIcon } from "@/components/heading-icon";
import { formatRoleDescriptionLines } from "../utils/format-utils";

interface IntervieweeInfoProps {
  roleDescription?: string | null;
  headingLevel?: "h2" | "h3";
}

export function IntervieweeInfo({
  roleDescription,
  headingLevel = "h2",
}: IntervieweeInfoProps) {
  if (!roleDescription) {
    return null;
  }

  const Heading = headingLevel;
  const lines = formatRoleDescriptionLines(roleDescription);

  return (
    <div className="flex flex-col gap-4">
      <Heading className="text-xl font-bold text-foreground">
        <HeadingIcon icon={UsersRound} />
        インタビューを受けた人
      </Heading>
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="text-sm text-foreground whitespace-pre-wrap font-medium">
          {lines.map((line, index) => (
            <p key={`${index}-${line.slice(0, 20)}`}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
