import "server-only";

import {
  getPublicRespondents as fetchPublicRespondents,
  type PublicRespondent,
} from "@mirai-gikai/topic-analysis-core/public-server";
import { cache } from "react";

export type { PublicRespondent };

/**
 * 意見募集の公開回答者一覧を取得する。
 *
 * k-匿名性しきい値（公開意見20件）に満たないテーマでは空配列が返る
 * （判定は @mirai-gikai/topic-analysis-core 側に集約）。
 * React cache() でリクエスト内のDB呼び出しを重複排除する。
 */
export const getPublicRespondents = cache(
  async (interviewConfigId: string): Promise<PublicRespondent[]> =>
    fetchPublicRespondents(interviewConfigId)
);
