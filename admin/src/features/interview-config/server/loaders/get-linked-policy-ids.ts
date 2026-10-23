import "server-only";

import { findPolicyIdsByInterviewConfigId } from "../repositories/interview-config-repository";

/**
 * 意見募集に紐づく施策IDを取得する。
 * 施策0件（抽象テーマ型）は正常な状態なので、空配列をそのまま返す。
 *
 * 取得に失敗しても空配列に倒さないこと。この値は編集フォームの初期値になり、
 * そのまま保存すると既存の紐づけをすべて外してしまうため、
 * 画面を開けないほうが安全。
 */
export async function getLinkedPolicyIds(configId: string): Promise<string[]> {
  return findPolicyIdsByInterviewConfigId(configId);
}
