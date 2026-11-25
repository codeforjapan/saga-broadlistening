import type { UserProfileOption } from "../constants/user-profile-options";
import type { UserProfile } from "../types/user-profile";

interface UserProfileChoices {
  ageGroups: readonly UserProfileOption[];
  areas: readonly UserProfileOption[];
}

/**
 * クライアントから届いた属性を確かめる純粋関数。
 * 未選択（undefined・null・空文字）は null にし、選択肢にないコードが来たら null を返す
 */
export function parseUserProfileInput(
  input: { ageGroup?: unknown; area?: unknown },
  choices: UserProfileChoices
): UserProfile | null {
  const ageGroup = parseChoice(input.ageGroup, choices.ageGroups);
  const area = parseChoice(input.area, choices.areas);
  if (ageGroup === undefined || area === undefined) return null;
  return { ageGroup, area };
}

/** 未選択なら null、選択肢にあればその値、どちらでもなければ undefined */
function parseChoice(
  value: unknown,
  options: readonly UserProfileOption[]
): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  return options.some((option) => option.value === value) ? value : undefined;
}
