import type { InterviewParticipationView } from "../types/interview-participation-view";

/** きかせてボックスの「はじめる」の出し方 */
export type KikaseteStart =
  | { kind: "link"; href: string }
  /** 外部アプリからだけ回答できるテーマを、アプリ外から見ている（#145 の案内に差し替える） */
  | {
      kind: "guide";
      participation: Extract<InterviewParticipationView, { kind: "guide" }>;
    }
  /** 募集中でない。ボタンを押せない状態で出す */
  | { kind: "unavailable" };

/**
 * 「はじめる」の出し方を決める。
 * 募集中でなければ押せない状態、参加条件を満たさなければアプリからの回答方法の案内、
 * それ以外は遷移先へのリンクにする。
 */
export function resolveKikaseteStart(params: {
  isOpen: boolean;
  startHref: string;
  participation: InterviewParticipationView;
}): KikaseteStart {
  if (!params.isOpen) {
    return { kind: "unavailable" };
  }
  if (params.participation.kind === "guide") {
    return { kind: "guide", participation: params.participation };
  }
  return { kind: "link", href: params.startHref };
}
