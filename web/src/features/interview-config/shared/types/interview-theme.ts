/**
 * トップページ・テーマ一覧で扱う「AIインタビューのテーマ」の表示単位。
 *
 * 参加導線は施策の有無によらずテーマ単独URL（/interviews/[slug]）を使うため、
 * 施策に紐づかない抽象テーマ型もそのままカードとして並べられる。
 * 施策の画像・タグは、紐づく施策があるときだけ表示のフォールバックに使う。
 */
export type InterviewTheme = {
  /** interview_configs.id */
  id: string;
  /** 参加導線のURLに使う識別子（interview_configs.slug） */
  slug: string;
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
};
