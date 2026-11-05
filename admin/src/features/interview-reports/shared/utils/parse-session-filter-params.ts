import {
  DEFAULT_SESSION_FILTER,
  MODERATION_FILTER_VALUES,
  type ModerationFilter,
  SESSION_STATUS_FILTER_VALUES,
  type SessionFilterConfig,
  type SessionStatusFilter,
  VISIBILITY_FILTER_VALUES,
  type VisibilityFilter,
} from "../types";

export function parseEnum<T extends string>(
  value: string | undefined,
  validValues: readonly T[],
  defaultValue: T
): T {
  if (value && (validValues as readonly string[]).includes(value)) {
    return value as T;
  }
  return defaultValue;
}

export function parseSessionFilterParams(
  status?: string,
  visibility?: string,
  moderation?: string
): SessionFilterConfig {
  return {
    status: parseEnum<SessionStatusFilter>(
      status,
      SESSION_STATUS_FILTER_VALUES,
      DEFAULT_SESSION_FILTER.status
    ),
    visibility: parseEnum<VisibilityFilter>(
      visibility,
      VISIBILITY_FILTER_VALUES,
      DEFAULT_SESSION_FILTER.visibility
    ),
    moderation: parseEnum<ModerationFilter>(
      moderation,
      MODERATION_FILTER_VALUES,
      DEFAULT_SESSION_FILTER.moderation
    ),
  };
}
