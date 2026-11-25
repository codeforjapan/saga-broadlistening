import {
  DEFAULT_MESSAGE_SEARCH_FILTER,
  type MessageSearchFilterConfig,
} from "../types";

export function parseMessageSearchFilterParams(
  roleTitle?: string
): MessageSearchFilterConfig {
  return {
    roleTitle: (roleTitle ?? "").trim(),
  };
}

export function hasReportLevelSearchFilters(
  filters: MessageSearchFilterConfig
): boolean {
  return filters.roleTitle !== "";
}

// フィルタをURLクエリパラメータに書き出す（デフォルト値のパラメータは省略）。
// parseMessageSearchFilterParams と対になるシリアライズ処理
export function appendMessageSearchFilterParams(
  params: URLSearchParams,
  filters: MessageSearchFilterConfig
): void {
  for (const key of ["roleTitle"] as const) {
    if (filters[key] !== DEFAULT_MESSAGE_SEARCH_FILTER[key]) {
      params.set(key, filters[key]);
    } else {
      params.delete(key);
    }
  }
}
