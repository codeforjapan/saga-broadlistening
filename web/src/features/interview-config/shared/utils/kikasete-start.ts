import type { InterviewParticipationView } from "../types/interview-participation-view";

/** きかせてボックスの「はじめる」の出し方 */
export type KikaseteStart =
  | { kind: "link"; href: string }
  /** 外部アプリからだけ回答できるテーマを、アプリ外から見ている（#145 の案内に差し替える） */
  | {
      kind: "guide";
      participation: Extract<InterviewParticipationView, { kind: "guide" }>;
    }
  /** 募集が終わった。結果（みんなの声のまとめ／トピック一覧）への導線を出す */
  | { kind: "result"; href: string };

/**
 * 「はじめる」の出し方を決める。
 * 募集中でなければ結果への導線、参加条件を満たさなければアプリからの回答方法の案内、
 * それ以外は遷移先へのリンクにする。
 * 終わったテーマの結果はアプリ外からも読めるので、参加条件の案内は募集中のときだけ出す。
 */
export function resolveKikaseteStart(params: {
  isOpen: boolean;
  startHref: string;
  /** 募集終了後の遷移先 */
  resultHref: string;
  participation: InterviewParticipationView;
}): KikaseteStart {
  if (!params.isOpen) {
    return { kind: "result", href: params.resultHref };
  }
  if (params.participation.kind === "guide") {
    return { kind: "guide", participation: params.participation };
  }
  return { kind: "link", href: params.startHref };
}
