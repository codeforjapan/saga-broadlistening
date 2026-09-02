import { routes } from "@/lib/routes";
import {
  type InterviewTarget,
  policyInterviewTarget,
  themeInterviewTarget,
} from "../types/interview-target";

/**
 * インタビュー関連ページのパスから参加導線の起点を復元する。
 *
 * ヘッダーのように pathname しか持たないクライアントコンポーネントが、
 * 施策経由かテーマ単独かを判別してリンクを組み立てるために使う。
 */
export function extractInterviewTargetFromPath(
  pathname: string,
  previewToken?: string
): InterviewTarget | null {
  const themeMatch = pathname.match(/^\/interviews\/([^/]+)/);
  if (themeMatch) {
    return themeInterviewTarget(themeMatch[1]);
  }

  const billMatch = pathname.match(/\/bills\/([^/]+)/);
  if (billMatch) {
    return policyInterviewTarget(billMatch[1], previewToken);
  }

  return null;
}

/**
 * 施策詳細ページへのリンクを取得
 */
export function getBillDetailLink(
  billId: string,
  previewToken?: string
): string {
  if (previewToken) {
    return routes.previewBillDetail(billId, previewToken);
  }
  return routes.billDetail(billId);
}

/**
 * インタビューLPページへのリンクを取得
 */
export function getInterviewLPLink(target: InterviewTarget): string {
  if (target.kind === "theme") {
    return routes.interviewThemeLP(target.slug);
  }
  if (target.previewToken) {
    return routes.previewInterviewLP(target.policyId, target.previewToken);
  }
  return routes.interviewLP(target.policyId);
}

/**
 * テーマの入口へのリンクを取得。
 *
 * 募集中のテーマはそのテーマのページへ、募集が終わったテーマは個別ページが
 * 公開されないためテーマ一覧へ送る。意見の戻り導線・トピック分析の戻り導線が
 * 同じ場所を指すよう、この判断はここに一本化する。
 */
export function getThemeHomeLink(theme: {
  slug: string;
  isOpen: boolean;
}): string {
  return theme.isOpen
    ? getInterviewLPLink(themeInterviewTarget(theme.slug))
    : routes.interviews();
}

/**
 * テーマ一覧のカードから飛ばす先を取得。
 *
 * 募集中のテーマは参加導線（テーマのLP）へ。募集が終わったテーマはLPが公開されないため、
 * 寄せられた意見のまとめ（トピック一覧）へ送る。
 * 「募集終了テーマの読者をどこへ送るか」は getThemeHomeLink と揃えてここで決める。
 */
export function getThemeCardLink(theme: {
  slug: string;
  isOpen: boolean;
}): string {
  return theme.isOpen
    ? getInterviewLPLink(themeInterviewTarget(theme.slug))
    : routes.interviewThemeTopics(theme.slug);
}

/**
 * インタビュー情報開示ページへのリンクを取得
 */
export function getInterviewDisclosureLink(target: InterviewTarget): string {
  if (target.kind === "theme") {
    return routes.interviewThemeDisclosure(target.slug);
  }
  if (target.previewToken) {
    return routes.previewInterviewDisclosure(
      target.policyId,
      target.previewToken
    );
  }
  return routes.interviewDisclosure(target.policyId);
}

/**
 * インタビューチャットページへのリンクを取得
 */
export function getInterviewChatLink(target: InterviewTarget): string {
  if (target.kind === "theme") {
    return routes.interviewThemeChat(target.slug);
  }
  if (target.previewToken) {
    return routes.previewInterviewChat(target.policyId, target.previewToken);
  }
  return routes.interviewChat(target.policyId);
}

/**
 * インタビューを離脱したときの戻り先へのリンクを取得。
 *
 * 施策経由なら施策詳細、テーマ単独なら参加元のテーマ一覧に戻す
 * （抽象テーマ型には戻り先になる施策ページがないため）。
 */
export function getInterviewExitLink(target: InterviewTarget): string {
  if (target.kind === "theme") {
    return routes.interviews();
  }
  return getBillDetailLink(target.policyId, target.previewToken);
}

/**
 * インタビュー完了レポートページへのリンクを取得
 */
export function getInterviewReportCompleteLink(reportId: string): string {
  return routes.reportComplete(reportId);
}

/**
 * 公開レポートページへのリンクを取得
 * @param from - 遷移元のコンテキスト。"opinions" の場合、戻るボタンがレポート一覧を指す
 */
export function getPublicReportLink(
  reportId: string,
  from?: "opinions"
): string {
  const base = routes.publicReport(reportId);
  if (from) {
    return `${base}?from=${from}`;
  }
  return base;
}

function getReportLinkForChatLogContext(
  reportId: string,
  from?: "complete" | "opinions"
): string {
  if (from === "complete") {
    return routes.reportComplete(reportId);
  }
  if (from === "opinions") {
    return getPublicReportLink(reportId, "opinions");
  }
  return routes.publicReport(reportId);
}

/**
 * インタビュー会話ログの表示先へのリンクを取得
 * @param from - 遷移元のコンテキスト。"complete" の場合は完了ページ内、"opinions" の場合は公開レポート一覧からの戻り文脈を維持する
 */
export function getInterviewChatLogLink(
  reportId: string,
  from?: "complete" | "opinions"
): string {
  return `${getReportLinkForChatLogContext(reportId, from)}#chat-log`;
}

/**
 * インタビュー会話ログ内の個別メッセージへのリンクを取得
 * @param from - 遷移元のコンテキスト。"complete" の場合は完了ページ内、"opinions" の場合は公開レポート一覧からの戻り文脈を維持する
 * @param quote - 引用文（逐語）。指定すると `?quote=` で渡し、レポート側で該当メッセージ内の該当部分を太字表示する。
 *   このとき `?mid=`（メッセージID）も併せて渡し、ハイライト対象を該当メッセージ1件に限定する
 *   （テキスト一致だけだと無関係なメッセージまで太字になるため）。
 */
export function getInterviewMessageLink(
  reportId: string,
  messageId: string,
  from?: "complete" | "opinions",
  quote?: string | null
): string {
  const base = getReportLinkForChatLogContext(reportId, from);
  const sep = base.includes("?") ? "&" : "?";
  const query = quote
    ? `${sep}quote=${encodeURIComponent(quote)}&mid=${encodeURIComponent(messageId)}`
    : "";
  return `${base}${query}#message-${messageId}`;
}
