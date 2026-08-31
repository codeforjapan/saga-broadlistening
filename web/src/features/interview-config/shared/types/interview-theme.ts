/**
 * トップページ・テーマ一覧で扱う「AIインタビューのテーマ」の表示単位。
 *
 * 参加導線（LP・チャット）は現状 /bills/[policyId]/interview のため、
 * カードから参加できるのは施策に紐づくテーマだけになる。
 * 施策を持たない抽象テーマ型の導線はテーマ単独のURLが必要で、未対応。
 */
export type InterviewTheme = {
  /** interview_configs.id */
  id: string;
  /** テーマ名 */
  name: string;
  /** テーマの説明（未設定なら null） */
  description: string | null;
  /** 想定所要時間（分。未設定なら null） */
  estimatedDuration: number | null;
  /** カードに出す画像URL（テーマ→施策→既定の順にフォールバック済み） */
  thumbnailUrl: string;
  /** 参加人数（対話セッション数） */
  participantCount: number;
  /** カテゴリ表示に使う、紐づく施策の代表タグ */
  categoryLabel: string | null;
  /** 参加導線に使う施策ID */
  policyId: string;
};
