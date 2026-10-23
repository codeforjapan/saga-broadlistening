import type { Database } from "@mirai-gikai/supabase";
import { PERSISTENT_HTTP_ONLY_COOKIE_OPTIONS } from "@/lib/cookies";

// 難易度レベルのEnum
export type DifficultyLevelEnum =
  Database["public"]["Enums"]["difficulty_level_enum"];

// 難易度のラベル
export const DIFFICULTY_LABELS: Record<DifficultyLevelEnum, string> = {
  normal: "ふつう",
  hard: "難しい",
};

// 難易度の説明
export const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevelEnum, string> = {
  normal: "中学生レベルの内容",
  hard: "専門用語を含む詳細な内容",
};

// Cookie名とデフォルト値
export const DIFFICULTY_COOKIE_NAME = "bill_difficulty_level";
export const DEFAULT_DIFFICULTY: DifficultyLevelEnum = "normal";

// 有効な難易度レベルの配列
export const VALID_DIFFICULTY_LEVELS: DifficultyLevelEnum[] = [
  "normal",
  "hard",
];

// Cookie設定オプション（first-party の長期 Cookie 共通設定）
export const DIFFICULTY_COOKIE_OPTIONS = PERSISTENT_HTTP_ONLY_COOKIE_OPTIONS;
