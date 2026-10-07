import { ExternalLink, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InterviewParticipationView } from "../../shared/types/interview-participation-view";

export function ExternalIdentityGuideNotice({
  participation,
}: {
  participation: Extract<InterviewParticipationView, { kind: "guide" }>;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-primary bg-muted p-4 text-sm text-foreground">
      <p className="flex items-center gap-2 font-bold">
        <Smartphone className="size-5 shrink-0" aria-hidden="true" />
        アプリから回答する方法
      </p>
      {participation.providers.length === 0 ? (
        <p>
          このテーマへの回答には、指定された外部アプリからのアクセスが必要です。
        </p>
      ) : (
        participation.providers.map((provider) => (
          <div key={provider.key} className="space-y-3">
            <p>
              インタビューへの回答は{provider.displayName}から受け付けています。
            </p>
            <p>
              {provider.displayName}を手動で開き、チカットで「
              {participation.themeName}
              」を選んでください。
            </p>
            {provider.guideUrl && (
              <Button
                asChild
                variant="outline"
                className="h-auto min-h-10 whitespace-normal"
              >
                <a
                  href={provider.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  回答方法を見る
                  <ExternalLink
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
