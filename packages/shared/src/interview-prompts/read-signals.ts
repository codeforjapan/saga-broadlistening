import { SUMMARY_RESPONSES } from "./output-schemas";
import type { SummaryResponse } from "./types";

/** LLM が本文と一緒に返す制御フラグ */
export interface TurnSignals {
  endRequest: boolean;
  personalRequest: boolean;
  offTopic: boolean;
  summaryResponse: SummaryResponse;
}


export const DEFAULT_TURN_SIGNALS: TurnSignals = {
  endRequest: false,
  personalRequest: false,
  offTopic: false,
  summaryResponse: "other",
};

/** 構造化出力の文字列を JSON として読む。読めなければ null */
export function parseStructuredOutput(
  text: string | null | undefined
): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * LLM の出力から制御フラグを読む。フラグの読み取りはこの1か所に集める
 * （将来、別の判定モデルに差し替える場合もここだけを変える）。
 *
 * 読めない項目は既定値（フラグは false、summary_response は other）にする。
 */
export function readSignals(out: unknown): TurnSignals {
  if (typeof out !== "object" || out === null) return DEFAULT_TURN_SIGNALS;
  const o = out as Record<string, unknown>;
  const summaryResponse = SUMMARY_RESPONSES.find(
    (r) => r === o.summary_response
  );
  return {
    endRequest: o.end_request === true,
    personalRequest: o.personal_request === true,
    offTopic: o.off_topic === true,
    summaryResponse: summaryResponse ?? "other",
  };
}
