import type { InterviewConfig } from "../types";

/** 意見募集の状態を日本語ラベルに変換する */
export function getStatusLabel(status: InterviewConfig["status"]): string {
  switch (status) {
    case "draft":
      return "下書き";
    case "open":
      return "募集中";
    case "closed":
      return "終了";
    default:
      return status;
  }
}
