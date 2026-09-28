export type SavedPromptVersion = {
  id: string;
  version: number;
  content: string;
  changeNote: string;
  createdBy: string | null;
  createdAt: string;
};

export function savedPromptResult(input: {
  expectedRevision: number;
  savedVersionId: string;
  state: {
    prompt: { revision: number };
    versions: {
      id: string;
      version: number;
      content: string;
      change_note: string;
      created_by: string | null;
      created_at: string;
    }[];
  };
}): { success: true; revision: number; version: SavedPromptVersion } | null {
  const version = input.state.versions.find(
    (item) => item.id === input.savedVersionId
  );
  if (!version) return null;
  // The read supplies immutable version metadata. Another admin may update
  // the prompt after our save, so its revision is not safe for this client.
  return {
    success: true as const,
    revision: input.expectedRevision + 1,
    version: {
      id: version.id,
      version: version.version,
      content: version.content,
      changeNote: version.change_note,
      createdBy: version.created_by,
      createdAt: version.created_at,
    },
  };
}
