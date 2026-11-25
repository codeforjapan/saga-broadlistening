import { normalizeRoleTitle } from "@mirai-gikai/topic-analysis-core/public";
import type { PublicOpinion } from "../types";

// 純粋ロジックの正準はパッケージ側。web 既存 import 互換のため再エクスポートする。
export { normalizeRoleTitle };

/** 肩書が無い（または汎用的な「市民」相当の）回答者に使うラベル。 */
export const DEFAULT_ATTRIBUTION_LABEL = "市民";

/**
 * 引用の属性表示ラベル。固有の肩書があればそれを、無ければ既定ラベルにフォールバックする。
 *
 * Epic #54 で回答者カテゴリ（user_category）が廃止されたため、
 * フォールバック先はカテゴリラベルではなく固定の「市民」になる。
 */
export function opinionAttributionLabel(opinion: PublicOpinion): string {
  return normalizeRoleTitle(opinion.role_title) ?? DEFAULT_ATTRIBUTION_LABEL;
}
