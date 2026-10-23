import { parseModelId } from "../config";
import { isKnownModel } from "../models";

/** 入力用の構文検証。利用可能なプロバイダーの認可はサーバー設定で別途行う。 */
export function isValidModelId(model: string): boolean {
  if (isKnownModel(model)) return true;
  // 既存形式のカタログ制約は維持し、新しいモデルは接続先を明示する。
  if (!model.includes(":")) return false;
  try {
    parseModelId(model);
    return true;
  } catch {
    return false;
  }
}
