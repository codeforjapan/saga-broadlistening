export type InterviewParticipationView =
  | { kind: "allowed" }
  | {
      kind: "guide";
      themeName: string;
      providers: {
        key: string;
        displayName: string;
        guideUrl: string | null;
      }[];
    };
