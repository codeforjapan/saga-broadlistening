export type OpenDataBillTag = {
  id: string;
  label: string;
};

export type OpenDataBillItem = {
  billId: string;
  /** 施策の正式名称 */
  name: string;
  /** 公開ページのURLに使う短い文字列 */
  slug: string;
  /** わかりやすいタイトル（難易度別コンテンツ由来） */
  title: string;
  /** 施策の概要（難易度別コンテンツ由来）。未設定の場合は空文字 */
  summary: string;
  /** 担当部署名 */
  department: string | null;
  /** 市民からの問い合わせ先 */
  contact: string | null;
  publishedAt: string | null;
  tags: OpenDataBillTag[];
  createdAt: string;
};

export type OpenDataBillsResult = {
  items: OpenDataBillItem[];
  nextCursor: string | null;
};

export type OpenDataBillDetail = OpenDataBillItem & {
  /** 施策の本文解説（Markdown、難易度別コンテンツ由来） */
  content: string;
};
